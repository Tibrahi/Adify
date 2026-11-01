import { config, type IconDefinition } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAngleDown,
  faArrowRight,
  faBars,
  faBell,
  faCalendarCheck,
  faCalendarDays,
  faCalendarPlus,
  faCheck,
  faChevronDown,
  faCircleCheck,
  faCircleExclamation,
  faCircleQuestion,
  faClock,
  faEnvelope,
  faEye,
  faEyeSlash,
  faFilter,
  faGear,
  faGlobeAfrica,
  faHouse,
  faLocationDot,
  faMagnifyingGlass,
  faPenToSquare,
  faPlus,
  faRightFromBracket,
  faRightToBracket,
  faTicket,
  faTrash,
  faUser,
  faUserPlus,
  faUsers,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

config.autoAddCss = false;

// Font Awesome only, black by default, one icon per action (TOOLS.md section 6).
const ICONS = {
  search: faMagnifyingGlass,
  register: faUserPlus,
  login: faRightToBracket,
  logout: faRightFromBracket,
  create: faCalendarPlus,
  booking: faTicket,
  bookings: faCalendarCheck,
  calendar: faCalendarDays,
  location: faLocationDot,
  email: faEnvelope,
  notifications: faBell,
  settings: faGear,
  help: faCircleQuestion,
  edit: faPenToSquare,
  delete: faTrash,
  expand: faChevronDown,
  more: faAngleDown,
  menu: faBars,
  close: faXmark,
  home: faHouse,
  user: faUser,
  users: faUsers,
  plus: faPlus,
  check: faCheck,
  clock: faClock,
  eye: faEye,
  eyeSlash: faEyeSlash,
  filter: faFilter,
  arrow: faArrowRight,
  globe: faGlobeAfrica,
  ok: faCircleCheck,
  warn: faCircleExclamation,
} satisfies Record<string, IconDefinition>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  label,
  className,
}: {
  name: IconName;
  label?: string;
  className?: string;
}) {
  return (
    <FontAwesomeIcon
      icon={ICONS[name]}
      className={className ?? 'text-black'}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    />
  );
}
