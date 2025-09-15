import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function SimpleCalculator() {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<string>("");
  const [operation, setOperation] = useState<string>("");
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);

  const inputNumber = (num: string) => {
    if (waitingForNewValue) {
      setDisplay(String(num));
      setWaitingForNewValue(false);
    } else {
      setDisplay(display === "0" ? String(num) : display + num);
    }
  };

  const inputDecimal = () => {
    if (waitingForNewValue) {
      setDisplay("0.");
      setWaitingForNewValue(false);
    } else if (display.indexOf(".") === -1) {
      setDisplay(display + ".");
    }
  };

  const clear = () => {
    setDisplay("0");
    setPreviousValue("");
    setOperation("");
    setWaitingForNewValue(false);
  };

  const performCalculation = () => {
    const inputValue = parseFloat(display);
    
    if (previousValue === "") {
      setPreviousValue(String(inputValue));
    } else if (operation) {
      const currentValue = parseFloat(previousValue) || 0;
      let result = currentValue;

      switch (operation) {
        case "+":
          result = currentValue + inputValue;
          break;
        case "-":
          result = currentValue - inputValue;
          break;
        case "×":
          result = currentValue * inputValue;
          break;
        case "÷":
          result = inputValue !== 0 ? currentValue / inputValue : 0;
          break;
        default:
          return;
      }

      setDisplay(String(result));
      setPreviousValue(String(result));
    }

    setWaitingForNewValue(true);
  };

  const handleOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === "") {
      setPreviousValue(String(inputValue));
    } else if (operation) {
      performCalculation();
    }

    setWaitingForNewValue(true);
    setOperation(nextOperation);
  };

  const buttons = [
    { label: "C", type: "clear", className: "bg-red-500 hover:bg-red-600 text-white" },
    { label: "±", type: "function", className: "bg-gray-500 hover:bg-gray-600 text-white" },
    { label: "%", type: "function", className: "bg-gray-500 hover:bg-gray-600 text-white" },
    { label: "÷", type: "operation", className: "bg-blue-500 hover:bg-blue-600 text-white" },
    
    { label: "7", type: "number", className: "bg-gray-200 hover:bg-gray-300 text-black" },
    { label: "8", type: "number", className: "bg-gray-200 hover:bg-gray-300 text-black" },
    { label: "9", type: "number", className: "bg-gray-200 hover:bg-gray-300 text-black" },
    { label: "×", type: "operation", className: "bg-blue-500 hover:bg-blue-600 text-white" },
    
    { label: "4", type: "number", className: "bg-gray-200 hover:bg-gray-300 text-black" },
    { label: "5", type: "number", className: "bg-gray-200 hover:bg-gray-300 text-black" },
    { label: "6", type: "number", className: "bg-gray-200 hover:bg-gray-300 text-black" },
    { label: "-", type: "operation", className: "bg-blue-500 hover:bg-blue-600 text-white" },
    
    { label: "1", type: "number", className: "bg-gray-200 hover:bg-gray-300 text-black" },
    { label: "2", type: "number", className: "bg-gray-200 hover:bg-gray-300 text-black" },
    { label: "3", type: "number", className: "bg-gray-200 hover:bg-gray-300 text-black" },
    { label: "+", type: "operation", className: "bg-blue-500 hover:bg-blue-600 text-white" },
    
    { label: "0", type: "number", className: "bg-gray-200 hover:bg-gray-300 text-black col-span-2" },
    { label: ".", type: "decimal", className: "bg-gray-200 hover:bg-gray-300 text-black" },
    { label: "=", type: "equals", className: "bg-green-500 hover:bg-green-600 text-white" },
  ];

  const handleButtonClick = (button: typeof buttons[0]) => {
    switch (button.type) {
      case "number":
        inputNumber(button.label);
        break;
      case "decimal":
        inputDecimal();
        break;
      case "operation":
        handleOperation(button.label);
        break;
      case "equals":
        performCalculation();
        break;
      case "clear":
        clear();
        break;
      case "function":
        // Handle functions like ± and %
        if (button.label === "±") {
          setDisplay(String(-parseFloat(display)));
        } else if (button.label === "%") {
          setDisplay(String(parseFloat(display) / 100));
        }
        break;
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <Card className="p-6 bg-white shadow-lg">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Calculator</h3>
          <div className="bg-gray-900 text-white p-4 rounded-lg text-right text-2xl font-mono">
            {display}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {buttons.map((button, index) => (
            <Button
              key={index}
              className={`h-12 text-lg font-medium ${button.className}`}
              onClick={() => handleButtonClick(button)}
            >
              {button.label}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
}
