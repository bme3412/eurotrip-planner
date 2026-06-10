import AgentMark from './AgentMark';
import { OLIVIER } from '@/lib/concierge/personas';

/** Olivier's identity mark — the brand default of AgentMark. */
export default function OlivierMark({ size = 40, className = '' }) {
  return <AgentMark persona={OLIVIER} size={size} className={className} />;
}
