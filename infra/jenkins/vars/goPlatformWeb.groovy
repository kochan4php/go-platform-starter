def call(Map cfg = [:]) {
    def component = cfg.get('component') ?: error("goPlatformWeb: 'component' is required")
    def imageRepo = cfg.get('imageRepo', "ghcr.io/kochan4php/${component}")

    pipeline {
        agent any

        options {
            timestamps()
            disableConcurrentBuilds()
        }

        environment {
            CI = 'true'
        }

        stages {
            stage('Install') {
                steps {
                    sh 'corepack enable && pnpm install --frozen-lockfile'
                }
            }
            stage('Lint') {
                steps {
                    sh 'pnpm lint'
                }
            }
            stage('Test') {
                steps {
                    sh 'pnpm test'
                }
            }
            stage('Build + budget') {
                steps {
                    sh 'pnpm contracts'
                    sh 'pnpm build'
                    sh 'pnpm check:budget'
                }
            }
            stage('Docker build') {
                steps {
                    sh "docker build -t ${imageRepo}:${env.BUILD_NUMBER} -f apps/${component}/Dockerfile ."
                }
            }
            stage('Push') {
                when { branch 'main' }
                steps {
                    withCredentials([usernamePassword(credentialsId: 'ghcr', usernameVariable: 'REG_USER', passwordVariable: 'REG_PASS')]) {
                        sh 'echo $REG_PASS | docker login ghcr.io -u $REG_USER --password-stdin'
                        sh "docker tag ${imageRepo}:${env.BUILD_NUMBER} ${imageRepo}:latest"
                        sh "docker push ${imageRepo}:${env.BUILD_NUMBER}"
                        sh "docker push ${imageRepo}:latest"
                    }
                }
            }
        }

        post {
            always {
                cleanWs()
            }
        }
    }
}
