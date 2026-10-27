pipeline {
    agent any

    tools {
        nodejs 'Node-20'
    }

    options {
        timeout(time: 40, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    environment {
        CI = 'true'
        AMBIENTE = "${env.BRANCH_NAME == 'main' ? 'PROD' : (env.BRANCH_NAME == 'QA' ? 'QA' : (env.BRANCH_NAME == 'DEV' ? 'DEV' : 'FEATURE'))}"
        HOOK_SUFIJO = "${env.BRANCH_NAME == 'main' ? 'prod' : (env.BRANCH_NAME == 'QA' ? 'qa' : 'dev')}"
        API_URL = "${env.BRANCH_NAME == 'main' ? 'https://hotel-booking-backend-acs-2026.onrender.com' : (env.BRANCH_NAME == 'QA' ? 'https://hotel-booking-backend-qa-acs-2026.onrender.com' : 'https://hotel-booking-backend-dev-acs-2026.onrender.com')}"
        FRONTEND_URL = "${env.BRANCH_NAME == 'main' ? 'https://hotel-booking-frontend-acs-2026.onrender.com' : (env.BRANCH_NAME == 'QA' ? 'https://hotel-booking-frontend-qa-acs-2026.onrender.com' : 'https://hotel-booking-frontend-dev-acs-2026.onrender.com')}"
    }

    stages {
        stage('Compilación') {
            steps {
                echo "Rama: ${env.BRANCH_NAME} | Ambiente: ${env.AMBIENTE} | API de pruebas: ${env.API_URL}"
                dir('backend') {
                    sh 'npm install --ignore-scripts'
                    sh 'find . -name "*.js" -not -path "./node_modules/*" -not -path "./coverage/*" -print0 | xargs -0 -n1 node --check'
                }
                dir('frontend') {
                    sh 'npm install'
                    sh 'npm run build'
                }
            }
        }

        stage('Pruebas unitarias del backend') {
            steps {
                dir('backend') {
                    sh 'npm test'
                }
            }
        }

        stage('Pruebas unitarias del frontend') {
            steps {
                dir('frontend') {
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
                sh 'npx --yes newman@6.2.2 run postman/hotel-booking.postman_collection.json -e postman/hotel-booking.postman_environment.json --env-var "base_url=$API_URL" --reporters cli,junit --reporter-junit-export newman/resultados.xml --timeout-request 120000'
            }
        }

        stage('Despliegue al ambiente') {
            when {
                anyOf {
                    branch 'DEV'
                    branch 'QA'
                    branch 'main'
                }
            }
            steps {
                withCredentials([
                    string(credentialsId: "render-hook-backend-${env.HOOK_SUFIJO}", variable: 'HOOK_BACKEND'),
                    string(credentialsId: "render-hook-frontend-${env.HOOK_SUFIJO}", variable: 'HOOK_FRONTEND')
                ]) {
                    sh '''
                        echo "Desplegando el backend en $AMBIENTE"
                        curl -fsS -X POST "$HOOK_BACKEND"
                        echo
                        echo "Desplegando el frontend en $AMBIENTE"
                        curl -fsS -X POST "$HOOK_FRONTEND"
                        echo
                    '''
                }
            }
        }

        stage('Verificación del ambiente') {
            when {
                anyOf {
                    branch 'DEV'
                    branch 'QA'
                    branch 'main'
                }
            }
            steps {
                sh '''
                    for URL in "$API_URL/api/roomcategory/getroomcategories" "$FRONTEND_URL/"; do
                      OK=0
                      for i in $(seq 1 30); do
                        CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 "$URL" || true)
                        echo "$URL -> $CODE"
                        if [ "$CODE" = "200" ]; then
                          OK=1
                          break
                        fi
                        sleep 20
                      done
                      if [ "$OK" != "1" ]; then
                        echo "El ambiente no respondió: $URL"
                        exit 1
                      fi
                    done
                '''
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
