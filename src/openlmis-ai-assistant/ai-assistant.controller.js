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
     * @ngdoc controller
     * @name openlmis-ai-assistant.controller:AiAssistantController
     *
     * @description
     * Drives the ask-and-poll cycle for the home page assistant.
     *
     * Answers take minutes on the current inference hardware, so the wait is the
     * dominant part of the interaction. Rather than a spinner, each tool the agent
     * runs is shown as it happens — which doubles as provenance once the answer
     * arrives: you can see that a product and facility were resolved before a
     * quantity was reported.
     */
    angular
        .module('openlmis-ai-assistant')
        .controller('AiAssistantController', controller);

    controller.$inject = ['$scope', '$interval', 'aiAgentService', 'AI_AGENT_POLL_INTERVAL'];

    function controller($scope, $interval, aiAgentService, AI_AGENT_POLL_INTERVAL) {

        var vm = this,
            poller;

        vm.$onInit = onInit;
        vm.$onDestroy = onDestroy;
        vm.ask = ask;
        vm.askExample = askExample;
        vm.startNewConversation = startNewConversation;
        vm.toggleOpen = toggleOpen;
        vm.toggleTrace = toggleTrace;

        /**
         * @ngdoc property
         * @propertyOf openlmis-ai-assistant.controller:AiAssistantController
         * @type {Array}
         * @name turns
         *
         * @description
         * The conversation so far. Each turn holds the question, the tools that ran,
         * and either an answer or an error message key.
         */
        vm.turns = undefined;

        /**
         * @ngdoc property
         * @propertyOf openlmis-ai-assistant.controller:AiAssistantController
         * @type {Boolean}
         * @name isBusy
         *
         * @description
         * True while a question is in flight. Only one question runs at a time
         * because the inference server serves one request at a time.
         */
        vm.isBusy = undefined;

        /**
         * @ngdoc property
         * @propertyOf openlmis-ai-assistant.controller:AiAssistantController
         * @type {Boolean}
         * @name isOpen
         *
         * @description
         * Whether the assistant panel is expanded. Collapsed by default so it does
         * not crowd the home page.
         */
        vm.isOpen = undefined;

        vm.question = undefined;
        vm.sessionId = undefined;

        vm.examples = [
            'openlmisAiAssistant.example.programmes',
            'openlmisAiAssistant.example.facility',
            'openlmisAiAssistant.example.product'
        ];

        function onInit() {
            vm.turns = [];
            vm.isBusy = false;
            vm.isOpen = false;
            vm.question = '';
            vm.sessionId = null;
        }

        /**
         * Polling must not outlive the component, or it keeps hitting the agent
         * service after the user has navigated away.
         */
        function onDestroy() {
            stopPolling();
        }

        function toggleOpen() {
            vm.isOpen = !vm.isOpen;
        }

        function toggleTrace(turn) {
            turn.traceHidden = !turn.traceHidden;
        }

        function askExample(messageKey) {
            vm.question = messageKey;
            ask(true);
        }

        /**
         * @ngdoc method
         * @methodOf openlmis-ai-assistant.controller:AiAssistantController
         * @name ask
         *
         * @description
         * Submits the current question and begins polling for the answer.
         *
         * @param {Boolean} isMessageKey true when the question is an i18n key rather
         *                               than literal text, as used by the examples
         */
        function ask(isMessageKey) {
            var question = (vm.question || '').trim();

            if (!question || vm.isBusy) {
                return;
            }

            var turn = {
                question: question,
                questionIsMessageKey: Boolean(isMessageKey),
                tools: [],
                startedAt: Date.now(),
                elapsed: 0,
                answer: null,
                errorKey: null,
                traceHidden: false
            };

            vm.turns.push(turn);
            vm.question = '';
            vm.isBusy = true;

            aiAgentService.ask(question, vm.sessionId)
                .then(function(job) {
                    vm.sessionId = job.session_id;
                    startPolling(job.job_id, turn);
                })
                .catch(function(errorKey) {
                    finish(turn, null, errorKey);
                });
        }

        function startNewConversation() {
            var previous = vm.sessionId;

            stopPolling();
            vm.turns = [];
            vm.sessionId = null;
            vm.isBusy = false;
            vm.question = '';

            aiAgentService.clearSession(previous);
        }

        function startPolling(jobId, turn) {
            stopPolling();

            poller = $interval(function() {
                turn.elapsed = Math.floor((Date.now() - turn.startedAt) / 1000);

                aiAgentService.getJob(jobId)
                    .then(function(job) {
                        turn.tools = job.tool_calls || [];

                        if (job.status === 'done') {
                            finish(turn, job.answer, null);
                            // Keep the trace, but fold it away once it is history.
                            turn.traceHidden = true;
                        } else if (job.status === 'error') {
                            finish(turn, null, errorKeyFor(job.error));
                        }
                    })
                    .catch(function(errorKey) {
                        finish(turn, null, errorKey);
                    });
            }, AI_AGENT_POLL_INTERVAL);
        }

        function stopPolling() {
            if (poller) {
                $interval.cancel(poller);
                poller = undefined;
            }
        }

        function finish(turn, answer, errorKey) {
            stopPolling();
            turn.elapsed = Math.floor((Date.now() - turn.startedAt) / 1000);
            turn.answer = answer;
            turn.errorKey = errorKey;
            vm.isBusy = false;
        }

        /**
         * The agent service reports failures as raw exception text. Map the ones a
         * user can act on to specific guidance, rather than showing them a stack of
         * Python class names.
         */
        function errorKeyFor(raw) {
            var text = (raw || '').toLowerCase();

            if (text.indexOf('connecterror') > -1) {
                return 'openlmisAiAssistant.error.unavailable';
            }
            if (text.indexOf('401') > -1 || text.indexOf('unauthor') > -1) {
                return 'openlmisAiAssistant.error.sessionExpired';
            }
            if (text.indexOf('403') > -1 || text.indexOf('forbidden') > -1) {
                return 'openlmisAiAssistant.error.notPermitted';
            }
            if (text.indexOf('timeout') > -1) {
                return 'openlmisAiAssistant.error.tookTooLong';
            }
            return 'openlmisAiAssistant.error.unknown';
        }

        $scope.$on('$destroy', stopPolling);
    }

})();
