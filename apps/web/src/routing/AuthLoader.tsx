import React from 'react';

export const AuthLoader: React.FC = () => {
  return (
    <div className="tc-loader-wrap">
      <div className="tc-spinner-ring" style={{ position: 'relative' }}>
        <div className="tc-orbit" />
      </div>
      <div className="tc-dots">
        <div className="tc-dot" />
        <div className="tc-dot" />
        <div className="tc-dot" />
      </div>
    </div>
  );
};
