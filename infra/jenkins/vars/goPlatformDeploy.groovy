def call(Map cfg = [:]) {
    pipeline {
        agent any
        parameters {
            choice(name: 'TARGET', choices: ['uat', 'demo', 'prod'], description: 'Protected deployment target')
            string(name: 'REVISION', defaultValue: 'origin/main', description: 'Commit or tag to promote')
            booleanParam(name: 'DRY_RUN', defaultValue: true, description: 'Print plan without changing the target')
        }
        options {
            timestamps()
            disableConcurrentBuilds()
            buildDiscarder(logRotator(numToKeepStr: '30'))
        }
        stages {
            stage('Promote') {
                steps {
                    lock(resource: "go-platform-${params.TARGET}") {
                        withCredentials([file(credentialsId: "go-platform-${params.TARGET}-env", variable: 'DEPLOY_ENV_FILE')]) {
                            sh 'set +x; ENV_FILE="$DEPLOY_ENV_FILE" ./scripts/promote.sh "$TARGET" "$REVISION" "$(test "$DRY_RUN" = true && echo --dry-run)"'
                        }
                    }
                }
            }
        }
        post {
            always { cleanWs() }
        }
    }
}
