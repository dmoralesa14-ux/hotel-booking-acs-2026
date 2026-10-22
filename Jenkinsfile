pipeline {
    agent any

    tools {
        nodejs 'Node-20'
    }

    options {
        timeout(time: 20, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    environment {
        CI = 'true'
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
    }

    post {
        always {
            archiveArtifacts artifacts: 'backend/coverage/**, frontend/coverage/**', allowEmptyArchive: true
        }
    }
}
