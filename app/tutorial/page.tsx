export default function Page() {
  const steps = [
    {
      title: "Install MetaMask",
      content:
        "Download and install the MetaMask wallet from the following platforms:\n\nFor Android/iOS: Install MetaMask from the App Store or Google Play Store.\n\nFor Windows/Mac: Add the MetaMask extension from the Chrome Webstore.",
    },
    {
      title: "Change the Wallet Network to Binance Smart Chain",
      content:
        "After setting up MetaMask, switch the wallet network to Binance Smart Chain (BSC) in the network settings.",
    },
    {
      title: "Add BNB (BEP20) to Your Wallet",
      content:
        "Deposit BNB (BEP20) into your wallet. This will be required to confirm gas for deploying the smart contract.",
    },
    {
      title: "Open the Deployment Link",
      content:
        "For Android/iOS: Open the Web3 browser in MetaMask and paste the deployment link or referral link (if you were referred to the community).\n\nFor Windows/Mac: Paste the deployment link or referral link directly into your browser.",
    },
    {
      title: "BNB",
      content:
        "Ensure your wallet has sufficient BNB to cover gas confirmations for all four stages of the contract deployment process.",
    },
    {
      title: "Deploy the Contract",
      content:
        "Start the deployment process by following the prompts.\n\nConfirm wallet connection and approve confirmation for all four stages of deployment.\n\nNote:\nDo not quit the deployment process before completing all four stages, as this may force restart the entire process.",
    },
    {
      title: "Completion",
      content:
        "Once the contract is deployed:\nYour wallet address will be added to the contract pool, enabling you to earn up to 2000 USDT.",
    },
    {
      title: "Manage Your USDT (BEP20)",
      content:
        "You can store or sell your earned USDT (BEP20) on popular exchange platforms such as:\n\n• Binance\n• Bybit\n• Coinbase",
    },
  ];

  return (
    <div className="px-8 py-4 space-y-10">
      <h1 className="text-2xl tracking-wider">
        How to Deploy the smart contract
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {steps.map((step, index) => (
          <div
            key={index}
            className="bg-[#090C17] border border-white/20 rounded-xl py-4 px-6"
          >
            <h3 className="font-semibold text-lg mb-2">
              Step {index + 1}: {step.title}
            </h3>
            <p className="text-gray-300 whitespace-pre-line">{step.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}