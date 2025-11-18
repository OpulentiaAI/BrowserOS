// Minimal Klavis API client for MCP operations in Electron runtime

class KlavisAPIClient {
  constructor(apiKey) {
    this.apiKey = apiKey || '';
    this.baseUrl = 'https://api.klavis.ai';
  }

  async _request(method, path, body, query) {
    if (!this.apiKey) {
      throw new Error('Klavis API key not configured. Please set KLAVIS_API_KEY in your environment.');
    }

    let url = `${this.baseUrl}${path}`;
    if (query) {
      const params = new URLSearchParams(query);
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Klavis API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  async getUserInstances(userId, platformName) {
    const data = await this._request('GET', '/user/instances', undefined, {
      user_id: userId,
      platform_name: platformName
    });
    return data.instances || [];
  }

  async listTools(instanceId, serverSubdomain) {
    const serverUrl = `https://${serverSubdomain}-mcp-server.klavis.ai/mcp/?instance_id=${instanceId}`;
    const data = await this._request('POST', '/mcp-server/list-tools', {
      serverUrl,
      format: 'openai',
      connectionType: 'StreamableHttp'
    });

    if (!data.success) {
      throw new Error(`Failed to list tools: ${data.error || 'Unknown error'}`);
    }

    return data.tools || [];
  }

  async callTool(instanceId, serverSubdomain, toolName, toolArgs) {
    const serverUrl = `https://${serverSubdomain}-mcp-server.klavis.ai/mcp/?instance_id=${instanceId}`;

    try {
      const result = await this._request('POST', '/mcp-server/call-tool', {
        serverUrl,
        toolName,
        toolArgs: toolArgs || {},
        format: 'openai',
        connectionType: 'StreamableHttp'
      });
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

module.exports = {
  KlavisAPIClient
};
