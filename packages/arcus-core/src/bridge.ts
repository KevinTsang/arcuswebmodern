/**
 * Bridge — Makes Arcus platform requests.
 *
 * Ported from src/cornea/bridge.js — replaced jQuery $.post with fetch.
 */

import cornea from './cornea';
import type { CorneaMessage } from './cornea';
import propertyAliases from './property-aliases';

function formatMessage(
  type: string,
  destination: string,
  attrs?: Record<string, any>,
): CorneaMessage {
  return {
    type,
    headers: {
      isRequest: true,
      destination,
    },
    payload: {
      messageType: type,
      attributes: attrs || {},
    },
  };
}

export interface BridgeConfig {
  apiUrl: string;
  version: string;
}

let bridgeConfig: BridgeConfig = {
  apiUrl: '',
  version: '',
};

const Bridge = {
  /**
   * Configure the bridge with API URL and version.
   * Must be called before using restfulRequest.
   */
  configure(config: BridgeConfig): void {
    bridgeConfig = config;
  },

  /**
   * Uses Cornea WebSocket to make a request.
   * Handles property alias/unalias transforms for rule contexts.
   */
  request<T = Record<string, any>>(
    type: string,
    destination: string,
    attrs?: Record<string, any>,
  ): Promise<T> {
    const unalias = propertyAliases.unalias[type];
    if (unalias && attrs?.context) {
      unalias(attrs.context);
    }

    const message = formatMessage(type, destination, attrs);
    return cornea.send(message).then((response) => {
      const alias = propertyAliases.alias[type];
      if (alias) {
        alias(response);
      }
      return response as T;
    });
  },

  /**
   * Uses fetch to make a RESTful request.
   * Replaces jQuery $.post with native fetch API.
   */
  async restfulRequest<T = Record<string, any>>(
    type: string,
    destination: string,
    attrs?: Record<string, any>,
  ): Promise<T> {
    const message = formatMessage(type, destination, attrs);
    const url = `${bridgeConfig.apiUrl.replace(/\/+$/, '')}/${type.replace(':', '/')}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Version': bridgeConfig.version,
      },
      credentials: 'include',
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      if (errorBody?.payload?.attributes) {
        throw errorBody.payload.attributes;
      }
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.payload.attributes as T;
  },
};

export default Bridge;
