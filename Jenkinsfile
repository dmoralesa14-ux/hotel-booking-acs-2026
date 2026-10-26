pipeline {
    agent any

    tools {
        nodejs 'Node-20'
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    environment {
        CI = 'true'
        API_URL = 'https://hotel-booking-backend-acs-2026.onrender.com'
    }

    stages {
        stage('Pruebas unitarias del backend') {
            steps {
                dir('backend') {
                    sh 'npm install --ignore-scripts'
                    sh 'npm test'
                }
            }
        }

        stage('Pruebas unitarias del frontend') {
            steps {
                dir('frontend') {
                    sh 'npm install'
                    sh 'npm test'
                }
            }
        }

        stage('Análisis de SonarQube Cloud') {
            when {
                branch 'main'
            }
            steps {
                sh '''
                    sed -i 's#^SF:#SF:backend/#' backend/coverage/lcov.info
                    sed -i 's#^SF:#SF:frontend/#' frontend/coverage/lcov.info
                '''
                withSonarQubeEnv('SonarCloud3872') {
                    script {
                        def scannerHome = tool 'SonarScanner3872'
                        sh "${scannerHome}/bin/sonar-scanner"
                    }
                }
            }
        }

        stage('Quality gate de SonarQube Cloud') {
            when {
                branch 'main'
            }
            steps {
                withSonarQubeEnv('SonarCloud3872') {
                    sh '''
                        TASK_URL=$(sed -n 's/^ceTaskUrl=//p' .scannerwork/report-task.txt)
                        ANALYSIS_ID=""
                        for i in $(seq 1 30); do
                          RESP=$(curl -s -u "$SONAR_AUTH_TOKEN:" "$TASK_URL")
                          STATUS=$(echo "$RESP" | grep -o '"status":"[A-Z_]*"' | head -1 | cut -d'"' -f4)
                          echo "Estado del análisis en SonarQube Cloud: $STATUS"
                          if [ "$STATUS" = "SUCCESS" ]; then
                            ANALYSIS_ID=$(echo "$RESP" | grep -o '"analysisId":"[^"]*"' | head -1 | cut -d'"' -f4)
                            break
                          fi
                          if [ "$STATUS" = "FAILED" ] || [ "$STATUS" = "CANCELED" ]; then
                            echo "El análisis terminó con estado $STATUS"
                            exit 1
                          fi
                          sleep 10
                        done
                        if [ -z "$ANALYSIS_ID" ]; then
                          echo "SonarQube Cloud no terminó de procesar el análisis a tiempo"
                          exit 1
                        fi
                        GATE=$(curl -sS -u "$SONAR_AUTH_TOKEN:" "${SONAR_HOST_URL%/}/api/qualitygates/project_status?analysisId=$ANALYSIS_ID")
                        GATE_STATUS=$(echo "$GATE" | grep -o '"status":"[A-Z]*"' | head -1 | cut -d'"' -f4)
                        echo "Respuesta de SonarQube Cloud: $GATE"
                        echo "Quality gate de SonarQube Cloud: $GATE_STATUS"
                        if [ "$GATE_STATUS" != "OK" ]; then
                          echo "El quality gate no fue aprobado"
                          exit 1
                        fi
                    '''
                }
            }
        }

        stage('Pruebas de API con Newman') {
            steps {
                sh 'mkdir -p newman'
                sh 'curl -s -o /dev/null --max-time 120 --retry 10 --retry-delay 10 --retry-all-errors "$API_URL/"'
                sh 'npx --yes newman@6.2.2 run postman/hotel-booking.postman_collection.json -e postman/hotel-booking.postman_environment.json --reporters cli,junit --reporter-junit-export newman/resultados.xml --timeout-request 120000'
            }
        }
    }

    post {
        always {
            junit allowEmptyResults: true, testResults: 'newman/resultados.xml'
            archiveArtifacts artifacts: 'backend/coverage/**, frontend/coverage/**, newman/**', allowEmptyArchive: true
        }
    }
}
