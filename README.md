# SplitLedger (Splitledes)

> Modern, high-precision offline expense tracker and bill splitter with exact penny reconciliation and multi-payer debt settlement.

## Features

- **Multi-Payer Support**: Split bills across multiple payers with custom split configurations (Equal, Exact, Percentage, Shares).
- **Exact Penny Reconciliation**: Balances every cent accurately to avoid rounding discrepancies.
- **Settlement Engine**: Calculates optimized debt settlement transactions minimizing the number of transfers needed.
- **Receipt & Summary Export**: Print or export clean settlement receipts and summary breakdowns.
- **Offline First**: Runs completely in the browser using HTML, CSS, and Vanilla JavaScript with no dependencies required.
- **Responsive & Modern UI**: Sleek, modern interface designed for both desktop and mobile viewports.

## Getting Started

Simply open `index.html` in any modern web browser or serve it using a local static server:

```bash
# Using Python
python -m http.server 3000

# Or using Node.js / npx
npx serve .
```

## Project Structure

```text
├── index.html     # Application markup and structure
├── style.css      # Styling, layout, and theme tokens
├── script.js     # State management, split algorithms, and event handling
└── README.md      # Project overview and documentation
```

## License

MIT