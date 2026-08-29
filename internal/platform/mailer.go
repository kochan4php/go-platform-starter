package platform

import (
	"context"
	"fmt"
	"log/slog"
	"net/smtp"
	"strings"
	"time"

	"github.com/prometheus/client_golang/prometheus"
)

var externalCallDuration = prometheus.NewHistogramVec(prometheus.HistogramOpts{
	Name: "external_call_duration_seconds", Help: "External call latency by bounded dependency and outcome.", Buckets: prometheus.DefBuckets,
}, []string{"dependency", "status"})

func init() { prometheus.MustRegister(externalCallDuration) }

type Mail struct {
	To      string
	Subject string
	HTML    string
}

type Mailer interface {
	Send(ctx context.Context, mail Mail) error
}

type FallbackMailer struct{ Primary, Secondary Mailer }

func (m FallbackMailer) Send(ctx context.Context, mail Mail) error {
	if err := m.Primary.Send(ctx, mail); err == nil {
		return nil
	}
	return m.Secondary.Send(ctx, mail)
}

type SMTPConfig struct {
	Driver   string `env:"MAILER_DRIVER" envDefault:"console"`
	Host     string `env:"SMTP_HOST"`
	Port     int    `env:"SMTP_PORT" envDefault:"587"`
	User     string `env:"SMTP_USER"`
	Pass     string `env:"SMTP_PASS"`
	From     string `env:"MAIL_FROM" envDefault:"noreply@example.local"`
	FromName string `env:"MAIL_FROM_NAME" envDefault:"Platform"`
}

func NewMailer(cfg SMTPConfig, log *slog.Logger) (Mailer, error) {
	switch cfg.Driver {
	case "console":
		return &ConsoleMailer{Log: log}, nil
	case "smtp":
		if cfg.Host == "" {
			return nil, fmt.Errorf("smtp driver requires SMTP_HOST")
		}
		addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
		var auth smtp.Auth
		if cfg.User != "" {
			auth = smtp.PlainAuth("", cfg.User, cfg.Pass, cfg.Host)
		}
		return &SMTPMailer{Addr: addr, Auth: auth, From: cfg.From, FromName: cfg.FromName}, nil
	default:
		return nil, fmt.Errorf("unknown MAILER_DRIVER %q", cfg.Driver)
	}
}

type ConsoleMailer struct{ Log *slog.Logger }

func (m *ConsoleMailer) Send(_ context.Context, mail Mail) error {
	started := time.Now()
	m.Log.Info("email (console transport)", "to", mail.To, "subject", mail.Subject)
	externalCallDuration.WithLabelValues("mail.console", "ok").Observe(time.Since(started).Seconds())
	return nil
}

type SMTPMailer struct {
	Addr     string
	Auth     smtp.Auth
	From     string
	FromName string
}

func BuildMIME(fromName, from string, mail Mail) []byte {
	var b strings.Builder
	fmt.Fprintf(&b, "From: %s <%s>\r\n", fromName, from)
	fmt.Fprintf(&b, "To: %s\r\n", mail.To)
	fmt.Fprintf(&b, "Subject: %s\r\n", mail.Subject)
	b.WriteString("MIME-Version: 1.0\r\n")
	b.WriteString("Content-Type: text/html; charset=\"utf-8\"\r\n")
	b.WriteString("\r\n")
	b.WriteString(mail.HTML)
	return []byte(b.String())
}

func (m *SMTPMailer) Send(_ context.Context, mail Mail) error {
	started := time.Now()
	err := smtp.SendMail(m.Addr, m.Auth, m.From, []string{mail.To}, BuildMIME(m.FromName, m.From, mail))
	status := "ok"
	if err != nil {
		status = "error"
	}
	externalCallDuration.WithLabelValues("mail.smtp", status).Observe(time.Since(started).Seconds())
	return err
}
