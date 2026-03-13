export const PAGE_SHELL_STYLES = `
  .page {
    background: #f4f6f8;
    border-radius: 16px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .section {
    margin-bottom: 12px;
  }
  .section:last-child {
    margin-bottom: 0;
  }
  .content-grid{
    flex: 1 1 auto;
    height: 0;
    overflow: hidden;
    .list-card,
    .detail-card {
      overflow: hidden;height: 100%;display: flex;flex-direction: column;
    }
  }
`;
