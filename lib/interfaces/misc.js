"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentTaskStatus = exports.AgentTaskScheduleType = exports.CalendarEventType = exports.ScpStandardId = void 0;
var ScpStandardId;
(function (ScpStandardId) {
    ScpStandardId["Community"] = "1";
    ScpStandardId["CommunityPost"] = "2";
    ScpStandardId["Channel"] = "3";
    ScpStandardId["ChannelMessage"] = "4";
    ScpStandardId["GroupKeys"] = "5";
    ScpStandardId["CommerceStall"] = "6";
    ScpStandardId["CommerceOrder"] = "7";
})(ScpStandardId = exports.ScpStandardId || (exports.ScpStandardId = {}));
var CalendarEventType;
(function (CalendarEventType) {
    CalendarEventType["DateBased"] = "dateBased";
    CalendarEventType["TimeBased"] = "timeBased";
})(CalendarEventType = exports.CalendarEventType || (exports.CalendarEventType = {}));
var AgentTaskScheduleType;
(function (AgentTaskScheduleType) {
    AgentTaskScheduleType["NoRepeat"] = "NoRepeat";
    AgentTaskScheduleType["Daily"] = "Daily";
    AgentTaskScheduleType["Weekly"] = "Weekly";
    AgentTaskScheduleType["Monthly"] = "Monthly";
    AgentTaskScheduleType["Annually"] = "Annually";
    AgentTaskScheduleType["Custom"] = "Custom";
})(AgentTaskScheduleType = exports.AgentTaskScheduleType || (exports.AgentTaskScheduleType = {}));
var AgentTaskStatus;
(function (AgentTaskStatus) {
    AgentTaskStatus["Active"] = "active";
    AgentTaskStatus["Inactive"] = "inactive";
})(AgentTaskStatus = exports.AgentTaskStatus || (exports.AgentTaskStatus = {}));
