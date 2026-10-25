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
