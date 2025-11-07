export function extractErrorMessage(err) {
  if (!err) return 'Unknown error';
  if (err.response?.data) {
    const data = err.response.data;
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    // handle object like { field: ["msg"] }
    if (typeof data === 'object') {
      const firstKey = Object.keys(data)[0];
      if (firstKey) {
        const val = data[firstKey];
        if (Array.isArray(val)) return `${firstKey}: ${val[0]}`;
        if (typeof val === 'string') return `${firstKey}: ${val}`;
      }
    }
  }
  return err.message || 'Request failed';
}
