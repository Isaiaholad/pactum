import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export default function CountdownTimer({ deadline }) {
  return <span className="text-sm text-slate-300">{dayjs(deadline).fromNow(true)} left</span>;
}
