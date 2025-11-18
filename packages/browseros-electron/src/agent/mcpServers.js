// MCP server configuration for Electron MCPTool

const MCP_SERVERS = [
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    subdomain: 'gcalendar'
  },
  {
    id: 'gmail',
    name: 'Gmail',
    subdomain: 'gmail'
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    subdomain: 'gsheets'
  },
  {
    id: 'google-docs',
    name: 'Google Docs',
    subdomain: 'gdocs'
  },
  {
    id: 'notion',
    name: 'Notion',
    subdomain: 'notion'
  }
];

module.exports = {
  MCP_SERVERS
};
