import React from 'react';

function BrowserControls({ onNavigate, currentUrl }) {
  const [url, setUrl] = React.useState('');

  React.useEffect(() => {
    setUrl(currentUrl);
  }, [currentUrl]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim()) {
      onNavigate(url.trim());
    }
  };

  const handleBack = () => {
    window.electron.goBack();
  };

  const handleForward = () => {
    window.electron.goForward();
  };

  const handleReload = () => {
    window.electron.reload();
  };

  return (
    <div className="browser-controls">
      <div className="nav-buttons">
        <button
          type="button"
          onClick={handleBack}
          className="nav-button"
          title="Back"
        >
          ←
        </button>
        <button
          type="button"
          onClick={handleForward}
          className="nav-button"
          title="Forward"
        >
          →
        </button>
        <button
          type="button"
          onClick={handleReload}
          className="nav-button"
          title="Reload"
        >
          ↻
        </button>
      </div>

      <form onSubmit={handleSubmit} className="url-bar-form">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter URL or search..."
          className="url-input"
        />
        <button type="submit" className="go-button">
          Go
        </button>
      </form>
    </div>
  );
}

export default BrowserControls;
