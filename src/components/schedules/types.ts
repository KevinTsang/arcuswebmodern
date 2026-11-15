/**
 * A command a schedule event can send, when the target supports more than one
 * (e.g. a rule is scheduled to `rule:Enable` or `rule:Disable`).
 */
export interface ScheduleMessageTypeOption {
  /** The platform command sent when the event fires. */
  value: string;
  /** Button / calendar label, e.g. "Active". */
  label: string;
  /** Events with this command are drawn muted on the calendar (e.g. "Inactive"). */
  inactive?: boolean;
}
