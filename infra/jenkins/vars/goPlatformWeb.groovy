def call(Map cfg = [:]) {
    def component = cfg.get('component') ?: error("goPlatformWeb: 'component' is required")
    def imageRepo = cfg.get('imageRepo', "ghcr.io/kochan4php/${component}")

    pipeline {
        agent any

        options {
            timestamps()
            disableConcurrentBuilds()
            buildDiscarder(logRotator(numToKeepStr: '30', artifactNumToKeepStr: '10'))
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
            stage('Quality') {
                parallel {
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
                when {
                    anyOf {
                        buildingTag()
                        changeset "apps/${component}/**"
                        changeset 'packages/**'
                        changeset 'pnpm-lock.yaml'
                    }
                }
                steps {
                    sh "docker build -t ${imageRepo}:${env.BUILD_NUMBER} -f apps/${component}/Dockerfile ."
                }
            }
            stage('Push') {
                when {
                    allOf {
                        branch 'main'
                        anyOf {
                            changeset "apps/${component}/**"
                            changeset 'packages/**'
                            changeset 'pnpm-lock.yaml'
                        }
                    }
                }
                steps {
                    withCredentials([usernamePassword(credentialsId: 'ghcr', usernameVariable: 'REG_USER', passwordVariable: 'REG_PASS')]) {
                        sh 'set +x; echo "$REG_PASS" | docker login ghcr.io -u "$REG_USER" --password-stdin'
                        sh "docker tag ${imageRepo}:${env.BUILD_NUMBER} ${imageRepo}:latest"
                        sh "docker push ${imageRepo}:${env.BUILD_NUMBER}"
                        sh "docker push ${imageRepo}:latest"
                        sh "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v \$PWD:/out anchore/syft:latest ${imageRepo}:${env.BUILD_NUMBER} -o spdx-json=/out/sbom-${component}.spdx.json"
                        withCredentials([file(credentialsId: 'cosign-private-key', variable: 'COSIGN_KEY'), string(credentialsId: 'cosign-password', variable: 'COSIGN_PASSWORD')]) {
                            sh "cosign sign --yes --key \$COSIGN_KEY ${imageRepo}:${env.BUILD_NUMBER}"
                        }
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
