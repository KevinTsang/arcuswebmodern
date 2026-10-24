'use client';

import { Contact } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';

export default function ContactSettingConfigurator({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const usehint = (device?.[Contact.ATTR_USEHINT] as string) ?? Contact.USEHINT_UNKNOWN;

  const options = [
    { value: Contact.USEHINT_DOOR, label: 'Door' },
    { value: Contact.USEHINT_WINDOW, label: 'Window' },
    { value: Contact.USEHINT_OTHER, label: 'Other' },
  ];

  return (
    <div>
      <p className="text-sm font-medium text-swift mb-2">Contact Type</p>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setAttribute(Contact.ATTR_USEHINT, opt.value)}
            data-testid={`contact-usehint-${opt.value.toLowerCase()}`}
            className={`
              px-3 py-1.5 text-sm rounded-[var(--border-radius-base)] transition-colors
              ${usehint === opt.value
                ? 'bg-peacock text-crane'
                : 'bg-pigeon text-coot hover:bg-heron'}
            `}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
