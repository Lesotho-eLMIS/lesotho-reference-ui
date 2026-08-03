/*
 * This program is part of the OpenLMIS logistics management information system platform software.
 * Copyright © 2017 VillageReach
 *
 * This program is free software: you can redistribute it and/or modify it under the terms
 * of the GNU Affero General Public License as published by the Free Software Foundation, either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details. You should have received a copy of
 * the GNU Affero General Public License along with this program. If not, see
 * http://www.gnu.org/licenses.  For additional information contact info@OpenLMIS.org.
 */

(function() {

    'use strict';

    /**
     * @ngdoc service
     * @name openlmis-ai-assistant.aiAgentService
     *
     * @description
     * Talks to the eLMIS agent service.
     *
     * Questions are submitted as jobs rather than blocking requests. Answers take
     * minutes to produce, and nginx closes proxied connections after NGINX_TIMEOUT
     * (60s by default), so a synchronous call would be cut off before it returned.
     *
     * Every request carries the signed-in user's access token. The agent service
     * passes that token through to the eLMIS API, so eLMIS applies the user's own
     * rights — the assistant cannot surface anything the user could not already see.
     */
    angular
        .module('openlmis-ai-assistant')
        .service('aiAgentService', service);

    service.$inject = ['$http', '$q', 'authorizationService', 'AI_AGENT_URL'];

    function service($http, $q, authorizationService, AI_AGENT_URL) {

        this.ask = ask;
        this.getJob = getJob;
        this.clearSession = clearSession;

        /**
         * @ngdoc method
         * @methodOf openlmis-ai-assistant.aiAgentService
         * @name ask
         *
         * @description
         * Submits a question. Resolves as soon as the job is accepted; the answer
         * is collected by polling getJob.
         *
         * @param  {String}  question  the user's question
         * @param  {String}  sessionId optional, to continue a conversation
         * @return {Promise}           resolves with { job_id, session_id, status }
         */
        function ask(question, sessionId) {
            return $http({
                method: 'POST',
                url: AI_AGENT_URL + '/ask',
                headers: headers(),
                data: {
                    question: question,
                    session_id: sessionId || null
                }
            })
                .then(function(response) {
                    return response.data;
                })
                .catch(rejectWithReason);
        }

        /**
         * @ngdoc method
         * @methodOf openlmis-ai-assistant.aiAgentService
         * @name getJob
         *
         * @description
         * Reads the current state of a submitted question. While the job is running
         * the tool_calls array grows, which the view uses to show progress.
         *
         * @param  {String}  jobId the id returned by ask
         * @return {Promise}       resolves with the job state
         */
        function getJob(jobId) {
            return $http({
                method: 'GET',
                url: AI_AGENT_URL + '/jobs/' + jobId,
                headers: headers()
            })
                .then(function(response) {
                    return response.data;
                })
                .catch(rejectWithReason);
        }

        /**
         * @ngdoc method
         * @methodOf openlmis-ai-assistant.aiAgentService
         * @name clearSession
         *
         * @description
         * Forgets a conversation's history. Failure is not surfaced — the user has
         * already moved on to a new conversation either way.
         *
         * @param  {String}  sessionId the conversation to forget
         * @return {Promise}           always resolves
         */
        function clearSession(sessionId) {
            if (!sessionId) {
                return $q.resolve();
            }
            return $http({
                method: 'DELETE',
                url: AI_AGENT_URL + '/sessions/' + sessionId,
                headers: headers()
            })
                .catch(function() {
                    return $q.resolve();
                });
        }

        function headers() {
            return {
                'Authorization': 'Bearer ' + authorizationService.getAccessToken(),
                'Content-Type': 'application/json'
            };
        }

        /**
         * Turns a transport failure into a message key the view can translate.
         * The user needs to know what to do next, not which layer failed.
         */
        function rejectWithReason(response) {
            if (response.status === 401) {
                return $q.reject('openlmisAiAssistant.error.sessionExpired');
            }
            if (response.status === 403) {
                return $q.reject('openlmisAiAssistant.error.notPermitted');
            }
            if (response.status === -1 || response.status === 0 || response.status === 404 ||
                response.status === 502 || response.status === 503 || response.status === 504) {
                return $q.reject('openlmisAiAssistant.error.unavailable');
            }
            return $q.reject('openlmisAiAssistant.error.unknown');
        }
    }

})();
