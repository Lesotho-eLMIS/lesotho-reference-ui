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

    angular
        .module('openlmis-ai-assistant')

        /**
         * Where the agent service is reachable. A path rather than an absolute URL,
         * so nginx routes it same-origin alongside the other services and no CORS
         * configuration is required.
         */
        .constant('AI_AGENT_URL', '/agent')

        /**
         * How often to check whether an answer is ready. Answers take minutes, so
         * polling faster than this only adds load without arriving sooner.
         */
        .constant('AI_AGENT_POLL_INTERVAL', 3000);

})();
