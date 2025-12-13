# BinanceLife Protocol Subgraph

### Luckypot > Points-based participation for Meme Community

This subgraph focuses on the "Lucky Points (LUCKY POINT)" model for the Luckypot platform. Users obtain LUCKY POINT via either time-lock conversion or staking mining, and consume LUCKY POINT to participate in Luckypot activities. LUCKY POINT is an internal ledger unit, not an ERC20.

## Repository Structure

- `abis/`: Contains JSON files defining the Application Binary Interfaces (ABIs) for various smart contracts used in the protocol.
- `config/`: Includes JSON configuration files for different networks (BSC, BSC Testnet and localhost).
- `src/mappings/`: Contains TypeScript files that define how to process and store events from the smart contracts.
- `schema.graphql`: Defines the GraphQL schema for the subgraph.
- `subgraph.template.yaml`: Template file for generating the subgraph manifest.
- `package.json`: Defines project dependencies and scripts for building and deploying the subgraph.

Key Files:
- `subgraph.template.yaml`: Main configuration file for the subgraph, defining data sources and mappings.
- `src/mappings/LuckypotContract.ts`: Processes Luckypot contract events (create, close, cancel, end, ticket, sponsor, prize transfer).
- `src/mappings/LuckyPointMiner.ts`: Processes staking and lock-related events (Locked/Unlocked, Staked/Unstaked, Claimed).

## Usage Instructions

### Installation

Prerequisites:
- Node.js (v16+ recommended)
- Yarn package manager

To install the project dependencies, run:

```bash
yarn install
```

### Prepare and Codegen

To prepare the subgraph for a specific network, use one of the following commands:

```bash
yarn prepare:dev
yarn prepare:bsc
yarn prepare:bscTestnet
```

These commands generate `subgraph.yaml` from the template and write context/data source configuration for different networks.

### Build and Deploy

To deploy the subgraph to a specific network, use one of the following commands:

```bash
yarn deploy:dev
yarn deploy:bsc
yarn deploy:bscTestnet

```

Set the following environment variables in `.env` before deployment:

- `THEGRAPH_TOKEN`: Authentication token for The Graph hosted service (if used).
- `GRAPH_NODE`: Graph Node URL (local or self-hosted).
- `GRAPH_NODE_KEY`: Deploy key for Graph Node (if required).
- `GRAPH_IPFS`: IPFS endpoint (local or self-hosted).

### Development

For local development:

1. Create a local subgraph:
   ```bash
   yarn create:dev
   ```

2. Deploy to the local Graph Node:
   ```bash
   yarn deploy:dev
   ```

3. To remove the local subgraph:
   ```bash
   yarn delete:dev
   ```

## Data and Event Flow

This subgraph processes data from the following core contracts:

- `LuckypotContract`: Tracks Luckypot lifecycle (create/close/cancel/end), user ticketing and sponsoring, prize transfers.
- `LuckyPointMiner`: Tracks time-lock conversion and staking mining (generation/claim/unstake) for LUCKY POINT.

Events update entities defined in `schema.graphql`, enabling queries for Luckypot participation, points production/consumption, and user statistics.

## Troubleshooting

1. Sync failure:
   - Verify contract addresses and `startBlock` in `subgraph.yaml`.
   - Ensure ABIs in `abis/` match deployed contracts.

2. Unexpected query results:
   - Check `schema.graphql` entity types match mapping writes.
   - Confirm array element types (`Bytes[]`, `boolean[]`, `i32[]`) are correct in mappings.

3. Deployment errors (e.g., `parse error: missing field data`):
   - Each `context` key in `subgraph.yaml` must contain both `type` and `data`.
   - Event signatures must exactly match ABI (e.g., `LuckypotEnded(indexed uint256,indexed address,uint32[])`).

For detailed logs and debugging:
- Use the Graph CLI's `graph logs` command to view indexing logs.
- Enable verbose logging in your Graph Node configuration for more detailed output.

## Manifest and Templates

`subgraph.template.yaml` defines data sources and templates, injecting network context (e.g., `chainId`) via Mustache. The generated `subgraph.yaml` must match deployed contract addresses, ABIs, and event signatures to ensure indexing works properly.

## Goldsky (Recommended)
1. Install the Goldsky CLI:
   ```
   yarn add @goldskycom/cli -D
   ```
2. Login Goldsky:
   ```
   npx goldsky login
   ```

3. Deploy to Goldsky:
   ```
   update bscTestnet.json > set network to "chapel"
   yarn prepare:bscTestnet
   yarn build
   npx goldsky subgraph deploy binancelife-bscTestnet/1.0.0 --path .

   ```
   
## Sentio (optional)
1. Install the Sentio CLI:
   ```
   yarn add @sentio/cli -D
   ```
2. Login Sentio:
   ```
   npx @sentio/cli login --api-key <api-key>

3. Deploy to Sentio:
   ```
   update bscTestnet.json > set network to "bsc-testnet"
   yarn prepare:bscTestnet
   yarn build
   npx @sentio/cli graph deploy --owner <owner> --name binancelife-bsc-testnet

   ```