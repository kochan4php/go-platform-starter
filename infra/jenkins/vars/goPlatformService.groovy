def call(Map cfg = [:]) {
    def component = cfg.get('component') ?: error("goPlatformService: 'component' is required")
    def imageRepo = cfg.get('imageRepo', "ghcr.io/kochan4php/${component}")

    pipeline {
        agent any

        options {
            timestamps()
            disableConcurrentBuilds()
        }

        environment {
            GOFLAGS = '-buildvcs=false'
        }

        stages {
            stage('Lint') {
                steps {
                    sh 'make lint'
                }
            }
            stage('Test') {
                steps {
                    sh 'make build test'
                }
            }
            stage('Contracts are fresh') {
                steps {
                    sh 'make contracts SVC=' + component
                    sh 'git diff --exit-code'
                }
            }
            stage('Docker build') {
                steps {
                    sh "docker build -t ${imageRepo}:${env.BUILD_NUMBER} -f services/${component}/Dockerfile ."
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
