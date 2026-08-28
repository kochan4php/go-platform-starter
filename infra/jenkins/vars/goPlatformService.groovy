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
                    // Only spec-codegen services have a codegen config; probe-only
                    // services (gateway, realtime, worker) skip this stage.
                    sh 'test -f services/' + component + '/codegen.cfg.yaml && make contracts SVC=' + component + ' || echo "no codegen config — skipping"'
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
