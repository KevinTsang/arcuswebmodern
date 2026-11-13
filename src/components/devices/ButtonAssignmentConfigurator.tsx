'use client';

import { useMemo } from 'react';
import { Device } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useAppSelector } from '@/store/hooks';
import { selectAllRules } from '@/store/slices/rulesSlice';
import {
  findButtonRule, getButtonActionOptions, getButtonProduct,
} from '@/lib/buttonAssignment';
import { ButtonAssignmentSelect } from './ButtonAssignmentSelect';

/**
 * Button assignment for buttons and key fobs: one action per button,
 * stored as a rule made from the product's button rule templates.
 */
export default function ButtonAssignmentConfigurator({ address }: { address: string }) {
  const device = useDevice(address);
  const rules = useAppSelector(selectAllRules);
  const templates = useAppSelector((s) => s.rules.ruleTemplates);
  const placeId = useAppSelector((s) => s.place.placeId);

  const productId = device?.[Device.ATTR_PRODUCTID];
  const product = getButtonProduct(productId);
  const options = useMemo(() => getButtonActionOptions(productId, templates), [productId, templates]);

  if (!device) return null;

  const buttons = product?.buttons ?? [];
  const title = `Button Assignment${buttons.length > 1 ? 's' : ''}`;

  return (
    <div>
      <p className="text-sm font-medium text-swift mb-2">{title}</p>
      {buttons.length === 0 || options.length === 0 ? (
        <p data-testid="button-assign-unsupported" className="text-sm text-grouse">
          Use Rules to choose what this device&apos;s buttons do.
        </p>
      ) : (
        <div className="space-y-3">
          {buttons.map((b) => (
            <ButtonAssignmentSelect
              key={b}
              deviceAddress={address}
              productId={productId}
              placeId={placeId}
              button={b}
              options={options}
              rule={findButtonRule(rules, address, b, options)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
