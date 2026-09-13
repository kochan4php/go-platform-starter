# Authentication UX principles

- Password managers, browser autofill, and password paste are supported. Paste is never blocked: allowing strong generated credentials is safer than forcing users to type them.
- Passwords and reset tokens remain in component memory only. Draft recovery stores normalized email addresses in `sessionStorage`, never secrets.
- Login errors and attempt feedback remain uniform for known and unknown email addresses to avoid account enumeration.
- Reset links are checked with a non-consuming server preflight; the actual reset still atomically consumes the single-use grant.
- Native form submit, browser history, semantic labels, error anchors, and live regions are retained so keyboard and assistive-technology behavior does not depend on JavaScript animation.
