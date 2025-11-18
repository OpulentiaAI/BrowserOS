const { toolSuccess, toolError } = require('../ToolInterface');

const VALID_RANGES = ['today', 'yesterday', 'lastWeek', 'lastMonth', 'last30Days', 'custom'];
const VALID_FORMATS = ['iso', 'date', 'us', 'eu', 'unix'];

function formatDate(date, format) {
  switch (format) {
    case 'iso':
      return date.toISOString();
    case 'date': {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    case 'us': {
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const y = date.getFullYear();
      return `${m}/${d}/${y}`;
    }
    case 'eu': {
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      return `${d}/${m}/${y}`;
    }
    case 'unix':
      return date.getTime();
    default:
      return formatDate(date, 'date');
  }
}

function createDateTool(context) {
  return {
    name: 'date_tool',
    description:
      'Get current date or calculate date ranges for automation. Ranges: today, yesterday, lastWeek, lastMonth, last30Days, custom. Formats: iso, date (YYYY-MM-DD), us, eu, unix.',
    parameters: {
      type: 'object',
      properties: {
        date_range: {
          type: 'string',
          enum: VALID_RANGES,
          description: 'Date range to calculate'
        },
        dayStart: {
          type: 'number',
          description:
            'For custom: days back from today for START (e.g., 300 = 300 days ago)',
          minimum: 0,
          maximum: 365
        },
        dayEnd: {
          type: 'number',
          description:
            'For custom: days back from today for END (e.g., 5 = 5 days ago)',
          minimum: 0,
          maximum: 365
        },
        format: {
          type: 'string',
          enum: VALID_FORMATS,
          description:
            'Output format: iso, date (YYYY-MM-DD), us (MM/DD/YYYY), eu (DD/MM/YYYY), unix (timestamp)',
          default: 'date'
        }
      },
      required: ['date_range']
    },
    execute: async ({ date_range, dayStart, dayEnd, format = 'date' }) => {
      try {
        context.incrementMetric('toolCalls');
        context.incrementToolUsageMetrics('date_tool');

        if (!VALID_RANGES.includes(date_range)) {
          return toolError(`Unknown date range: ${date_range}`);
        }
        if (!VALID_FORMATS.includes(format)) {
          return toolError(`Unknown date format: ${format}`);
        }

        const now = new Date();
        let startDate;
        let endDate;
        let isSingle = false;

        switch (date_range) {
          case 'today':
            startDate = new Date(now);
            endDate = new Date(now);
            isSingle = true;
            break;
          case 'yesterday':
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 1);
            endDate = new Date(startDate);
            isSingle = true;
            break;
          case 'lastWeek':
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 7);
            endDate = new Date(now);
            break;
          case 'lastMonth':
          case 'last30Days':
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 30);
            endDate = new Date(now);
            break;
          case 'custom':
            if (dayStart === undefined || dayEnd === undefined) {
              return toolError('dayStart and dayEnd are required for custom date range');
            }
            if (dayStart < dayEnd) {
              return toolError('dayStart must be >= dayEnd (dayStart is further back in time)');
            }
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - dayStart);
            endDate = new Date(now);
            endDate.setDate(endDate.getDate() - dayEnd);
            break;
        }

        if (format !== 'iso') {
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(0, 0, 0, 0);
        }

        const formattedStart = formatDate(startDate, format);
        const formattedEnd = formatDate(endDate, format);

        if (isSingle) {
          return toolSuccess(JSON.stringify({ date: formattedStart }));
        }
        return toolSuccess(JSON.stringify({ startDate: formattedStart, endDate: formattedEnd }));
      } catch (error) {
        return toolError(`Date calculation failed: ${error.message}`);
      }
    }
  };
}

module.exports = { createDateTool };
