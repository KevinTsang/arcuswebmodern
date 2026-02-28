'use client';

/**
 * DevicePanel — main device row component in the device list.
 *
 * Replaces src/components/device/panel/. Shows device icon, name,
 * status, action controls, and badges. Supports opening side panels
 * for configuration, details, and errors.
 */

import { memo, useState, useCallback } from 'react';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import {
  useDeviceConfig,
  useDeviceStatus,
  isDeviceOffline,
  isDeviceOn,
} from '@/hooks/useDeviceConfig';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';
import { DeviceIcon } from './DeviceIcon';
import { DeviceActions } from './DeviceActions';
import { DeviceBadges } from './DeviceBadges';
import { DeviceConfigurationPanel } from './DeviceConfigurationPanel';
import { DeviceDetailPanel } from './DeviceDetailPanel';

interface DevicePanelProps {
  address: string;
}

function DevicePanelInner({ address }: DevicePanelProps) {
  const device = useDevice(address);
  const config = useDeviceConfig(address);
  const status = useDeviceStatus(address);
  const { openRight } = useSidePanel();
  const dispatch = useAppDispatch();
  const { setAttribute } = useDeviceActions(address);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');

  if (!device || !config) return null;

  const name = (device['dev:name'] as string) ?? 'Unknown Device';
  const offline = isDeviceOffline(device);
  const on = isDeviceOn(device, config);
  const panelAction = config['web:panel:action'];
  const isFavorite = device['dev:favorite'] === true;
  const hasErrors = !!(device['devadv:errors'] as Record<string, string> | undefined);

  const handleStartRename = () => {
    setNameValue(name);
    setEditingName(true);
  };

  const handleSaveName = async () => {
    if (nameValue.trim() && nameValue.trim() !== name) {
      try {
        await setAttribute('dev:name', nameValue.trim());
      } catch {
        dispatch(addNotification({ type: 'error', message: 'Failed to rename device' }));
      }
    }
    setEditingName(false);
  };

  const handleToggleFavorite = async () => {
    try {
      await setAttribute('dev:favorite', !isFavorite);
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to update favorite' }));
    }
  };

  const handleOpenConfig = () => {
    openRight(<DeviceConfigurationPanel address={address} />);
  };

  const handleOpenDetails = () => {
    openRight(<DeviceDetailPanel address={address} />);
  };

  return (
    <div
      className={`
        border-b border-heron py-4 px-2
        ${offline ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <DeviceIcon address={address} size="md" />

        {/* Name and status */}
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') setEditingName(false);
              }}
              className="w-full text-sm font-medium text-swift bg-transparent border-b border-peacock focus:outline-none"
              autoFocus
            />
          ) : (
            <button
              onClick={handleStartRename}
              className="text-sm font-medium text-swift hover:text-peacock text-left truncate block w-full"
              title="Click to rename"
            >
              {name}
            </button>
          )}
          <p className="text-xs text-grouse mt-0.5">
            {offline ? 'Offline' : status}
          </p>
        </div>

        {/* Action control */}
        {panelAction && !offline && (
          <div className="flex-shrink-0">
            <DeviceActions address={address} action={panelAction} />
          </div>
        )}

        {/* Quick actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Favorite */}
          <button
            onClick={handleToggleFavorite}
            className={`p-1.5 rounded transition-colors ${
              isFavorite ? 'text-canary' : 'text-heron hover:text-grouse'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              {isFavorite ? (
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              ) : (
                <path fillRule="evenodd" d="M10 1l2.39 6.35H18l-4.95 3.6L14.82 18 10 14.27 5.18 18l1.77-7.05L2 7.35h5.61L10 1z" clipRule="evenodd" />
              )}
            </svg>
          </button>

          {/* Config gear */}
          <button
            onClick={handleOpenConfig}
            className="p-1.5 rounded text-grouse hover:text-swift transition-colors"
            title="Configuration"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Details info */}
          <button
            onClick={handleOpenDetails}
            className="p-1.5 rounded text-grouse hover:text-swift transition-colors"
            title="Details"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          </button>

          {/* Error/warning indicator */}
          {hasErrors && (
            <span className="p-1.5 text-cardinal" title="Device has errors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </span>
          )}
        </div>
      </div>

      {/* Badges row */}
      <div className="mt-2 ml-13 pl-0.5">
        <DeviceBadges address={address} />
      </div>
    </div>
  );
}

export const DevicePanel = memo(DevicePanelInner);
