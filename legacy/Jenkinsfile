// NOTE: GitHub Actions (.github/workflows/ci.yml) is the primary CI for this template.
// This Jenkinsfile remains for teams already running Jenkins/DevSecOps toolchains —
// it is not exercised by the template's own test suite.

pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'express_ts_starter'
        DOCKER_REGISTRY = 'my-docker-registry.com'
        DOCKER_CREDENTIALS_ID = 'docker-registry-credentials'
        K8S_CREDENTIALS_ID = 'k8s-kubeconfig'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Secrets Scan') {
            steps {
                // Hard fail on any finding
                sh 'docker run --rm -v "${WORKSPACE}:/path" zricethezav/gitleaks:latest detect --source="/path" -v'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'pnpm install --frozen-lockfile'
            }
        }

        stage('Lint') {
            steps {
                sh 'pnpm run lint'
            }
        }

        stage('Typecheck') {
            steps {
                sh 'pnpm run typecheck'
            }
        }

        stage('SCA Scan') {
            steps {
                sh 'pnpm audit --audit-level=high'
            }
        }

        stage('SAST') {
            steps {
                sh 'pnpm run sast'
            }
        }

        stage('Test') {
            steps {
                // e2e tests use testcontainers and require a Docker socket
                sh 'pnpm run test'
            }
        }

        stage('Build Image') {
            steps {
                script {
                    dockerImage = docker.build("${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${env.BUILD_ID}")
                }
            }
        }

        stage('Container Image Scan') {
            steps {
                // Fail the build on HIGH/CRITICAL vulnerabilities
                sh "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image --exit-code 1 --severity HIGH,CRITICAL ${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${env.BUILD_ID}"
            }
        }

        stage('Push Image') {
            steps {
                script {
                    docker.withRegistry("https://${DOCKER_REGISTRY}", DOCKER_CREDENTIALS_ID) {
                        dockerImage.push()
                        dockerImage.push('latest')
                    }
                }
            }
        }

        stage('Deploy to Staging') {
            steps {
                withKubeConfig([credentialsId: K8S_CREDENTIALS_ID]) {
                    // Manifests are applied as-is; the image tag is injected via
                    // `kubectl set image` instead of mutating files in the workspace.
                    sh 'kubectl apply -f k8s/configmap.yaml -n staging'
                    sh 'kubectl apply -f k8s/deployment.yaml -n staging'
                    sh 'kubectl apply -f k8s/service.yaml -n staging'
                    sh 'kubectl apply -f k8s/hpa.yaml -n staging'
                    sh "kubectl set image deployment/express-ts-starter express-ts-starter=${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${env.BUILD_ID} -n staging"
                    sh 'kubectl rollout status deployment/express-ts-starter -n staging'
                }
            }
        }

        stage('DAST Scan') {
            steps {
                // OWASP ZAP API scan against the spec served by the app itself
                sh '''docker run --rm \
                  -v "${WORKSPACE}:/zap/wrk:rw" \
                  zaproxy/zap-stable zap-api-scan.py \
                  -t http://express-ts-starter.staging.svc.cluster.local:3000/docs/openapi.json \
                  -f openapi -l FAIL'''
            }
        }

        stage('Deploy to Production') {
            steps {
                withKubeConfig([credentialsId: K8S_CREDENTIALS_ID]) {
                    input message: 'Promote to production?', ok: 'Deploy'
                    sh 'kubectl apply -f k8s/configmap.yaml -n production'
                    sh 'kubectl apply -f k8s/deployment.yaml -n production'
                    sh 'kubectl apply -f k8s/service.yaml -n production'
                    sh 'kubectl apply -f k8s/hpa.yaml -n production'
                    sh "kubectl set image deployment/express-ts-starter express-ts-starter=${DOCKER_REGISTRY}/${DOCKER_IMAGE}:${env.BUILD_ID} -n production"
                    sh 'kubectl rollout status deployment/express-ts-starter -n production'
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            echo 'Deployment to production successful!'
        }
        failure {
            echo 'Pipeline failed!'
        }
    }
}
