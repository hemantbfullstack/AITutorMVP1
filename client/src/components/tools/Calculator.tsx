import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Trash2, Send, History, Calculator as CalculatorIcon, Fuel } from "lucide-react";

interface CalculatorProps {
  onSendToChat?: (expression: string, result: string) => void;
}

type CalculatorMode = "normal" | "scientific";

export function Calculator({ onSendToChat }: CalculatorProps) {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<string>("");
  const [operation, setOperation] = useState<string>("");
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);
  const [history, setHistory] = useState<Array<{ expression: string; result: string }>>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [mode, setMode] = useState<CalculatorMode>("normal");

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
        case "=":
          result = inputValue;
          break;
        default:
          return;
      }

      const expression = `${previousValue} ${operation} ${inputValue}`;
      const resultString = String(result);
      
      setHistory(prev => [{
        expression,
        result: resultString
      }, ...prev.slice(0, 9)]);

      setDisplay(resultString);
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

  const handleFunction = (func: string) => {
    const inputValue = parseFloat(display);
    let result: number;

    switch (func) {
      case "sin":
        result = Math.sin(inputValue * Math.PI / 180);
        break;
      case "cos":
        result = Math.cos(inputValue * Math.PI / 180);
        break;
      case "tan":
        result = Math.tan(inputValue * Math.PI / 180);
        break;
      case "ln":
        result = Math.log(inputValue);
        break;
      case "log":
        result = Math.log10(inputValue);
        break;
      case "√":
        result = Math.sqrt(inputValue);
        break;
      case "x²":
        result = inputValue * inputValue;
        break;
      case "1/x":
        result = 1 / inputValue;
        break;
      case "±":
        result = -inputValue;
        break;
      case "%":
        result = inputValue / 100;
        break;
      case "x³":
        result = inputValue * inputValue * inputValue;
        break;
      case "xʸ":
        // For now, just square it. In a real implementation, you'd need a second input
        result = Math.pow(inputValue, 2);
        break;
      case "eˣ":
        result = Math.exp(inputValue);
        break;
      case "10ˣ":
        result = Math.pow(10, inputValue);
        break;
      case "|x|":
        result = Math.abs(inputValue);
        break;
      case "n!":
        result = factorial(inputValue);
        break;
      case "sinh":
        result = Math.sinh(inputValue);
        break;
      case "cosh":
        result = Math.cosh(inputValue);
        break;
      case "tanh":
        result = Math.tanh(inputValue);
        break;
      case "(":
        // For now, just add opening parenthesis to display
        setDisplay(display + "(");
        setWaitingForNewValue(false);
        return;
      case ")":
        // For now, just add closing parenthesis to display
        setDisplay(display + ")");
        setWaitingForNewValue(false);
        return;
      default:
        return;
    }

    const expression = `${func}(${inputValue})`;
    const resultString = String(result);
    
    setHistory(prev => [{
      expression,
      result: resultString
    }, ...prev.slice(0, 9)]);

    setDisplay(resultString);
    setWaitingForNewValue(true);
  };

  const factorial = (n: number): number => {
    if (n < 0 || n !== Math.floor(n)) return NaN;
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  };

  const sendToChat = () => {
    if (history.length > 0) {
      const latest = history[0];
      onSendToChat?.(latest.expression, latest.result);
    }
  };

  // Normal calculator buttons
  const normalButtons = [
    { label: "C", type: "clear", className: "calculator-button calculator-button-secondary" },
    { label: "±", type: "function", className: "calculator-button calculator-button-secondary" },
    { label: "%", type: "function", className: "calculator-button calculator-button-secondary" },
    { label: "÷", type: "operation", className: "calculator-button calculator-button-primary" },
    
    { label: "7", type: "number", className: "calculator-button calculator-button-secondary" },
    { label: "8", type: "number", className: "calculator-button calculator-button-secondary" },
    { label: "9", type: "number", className: "calculator-button calculator-button-secondary" },
    { label: "×", type: "operation", className: "calculator-button calculator-button-primary" },
    
    { label: "4", type: "number", className: "calculator-button calculator-button-secondary" },
    { label: "5", type: "number", className: "calculator-button calculator-button-secondary" },
    { label: "6", type: "number", className: "calculator-button calculator-button-secondary" },
    { label: "-", type: "operation", className: "calculator-button calculator-button-primary" },
    
    { label: "1", type: "number", className: "calculator-button calculator-button-secondary" },
    { label: "2", type: "number", className: "calculator-button calculator-button-secondary" },
    { label: "3", type: "number", className: "calculator-button calculator-button-secondary" },
    { label: "+", type: "operation", className: "calculator-button calculator-button-primary" },
    
    { label: "0", type: "number", className: "calculator-button calculator-button-secondary col-span-2" },
    { label: ".", type: "decimal", className: "calculator-button calculator-button-secondary" },
    { label: "=", type: "equals", className: "calculator-button calculator-button-primary" },
  ];

  // Scientific calculator buttons
  const scientificButtons = [
    { label: "C", type: "clear", className: "calculator-button calculator-button-secondary" },
    { label: "±", type: "function", className: "calculator-button calculator-button-secondary" },
    { label: "%", type: "function", className: "calculator-button calculator-button-secondary" },
    { label: "÷", type: "operation", className: "calculator-button calculator-button-primary" },
    
    { label: "sin", type: "function", className: "calculator-button calculator-button-outline" },
    { label: "cos", type: "function", className: "calculator-button calculator-button-outline" },
    { label: "tan", type: "function", className: "calculator-button calculator-button-outline" },
    { label: "×", type: "operation", className: "calculator-button calculator-button-primary" },
    
    { label: "ln", type: "function", className: "calculator-button calculator-button-outline" },
    { label: "log", type: "function", className: "calculator-button calculator-button-outline" },
    { label: "√", type: "function", className: "calculator-button calculator-button-outline" },
    { label: "-", type: "operation", className: "calculator-button calculator-button-primary" },
    
    { label: "x²", type: "function", className: "calculator-button calculator-button-outline" },
    { label: "x³", type: "function", className: "calculator-button calculator-button-outline" },
    { label: "xʸ", type: "function", className: "calculator-button calculator-button-outline" },
    { label: "+", type: "operation", className: "calculator-button calculator-button-primary" },
    
    { label: "sinh", type: "function", className: "calculator-button calculator-button-outline" },
    { label: "cosh", type: "function", className: "calculator-button calculator-button-outline" },
    { label: "tanh", type: "function", className: "calculator-button calculator-button-outline" },
    { label: "=", type: "equals", className: "calculator-button calculator-button-primary" },
    
    { label: "eˣ", type: "function", className: "calculator-button calculator-button-outline" },
    { label: "10ˣ", type: "function", className: "calculator-button calculator-button-outline" },
    { label: "|x|", type: "function", className: "calculator-button calculator-button-outline" },
    { label: "1/x", type: "function", className: "calculator-button calculator-button-outline" },
    
    { label: "n!", type: "function", className: "calculator-button calculator-button-outline" },
    { label: "π", type: "constant", className: "calculator-button calculator-button-outline" },
    { label: "(", type: "function", className: "calculator-button calculator-button-outline" },
    { label: ")", type: "function", className: "calculator-button calculator-button-outline" },
    
    { label: "7", type: "number", className: "calculator-button calculator-button-secondary" },
    { label: "8", type: "number", className: "calculator-button calculator-button-secondary" },
    { label: "9", type: "number", className: "calculator-button calculator-button-secondary" },
    
    { label: "4", type: "number", className: "calculator-button calculator-button-secondary" },
    { label: "5", type: "number", className: "calculator-button calculator-button-secondary" },
    { label: "6", type: "number", className: "calculator-button calculator-button-secondary" },
    
    { label: "1", type: "number", className: "calculator-button calculator-button-secondary" },
    { label: "2", type: "number", className: "calculator-button calculator-button-secondary" },
    { label: "3", type: "number", className: "calculator-button calculator-button-secondary" },
    
    { label: "0", type: "number", className: "calculator-button calculator-button-secondary col-span-2" },
    { label: ".", type: "decimal", className: "calculator-button calculator-button-secondary" },
  ];

  const buttons = mode === "normal" ? normalButtons : scientificButtons;

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
        handleFunction(button.label);
        break;
      case "constant":
        if (button.label === "π") {
          setDisplay(String(Math.PI));
          setWaitingForNewValue(true);
        }
        break;
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalculatorIcon className="w-5 h-5 text-primary" />
          <h3 className="font-medium">Calculator</h3>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            data-testid="button-history"
          >
            <History className="w-4 h-4" />
          </Button>
          {history.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={sendToChat}
              data-testid="button-send-to-chat"
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Calculator Mode Toggle */}
      <div className="flex items-center justify-center">
        <ToggleGroup type="single" value={mode} onValueChange={(value) => value && setMode(value as CalculatorMode)}>
          <ToggleGroupItem value="normal" className="px-4 py-2">
            <CalculatorIcon className="w-4 h-4 mr-2" />
            Normal
          </ToggleGroupItem>
          <ToggleGroupItem value="scientific" className="px-4 py-2">
            <Fuel className="w-4 h-4 mr-2" />
            Scientific
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Card className="p-4">
        <div className="calculator-display text-right text-2xl font-mono mb-4" data-testid="calculator-display">
          {display}
        </div>

        <div className={`grid gap-2 text-sm ${mode === "normal" ? "grid-cols-4" : "grid-cols-4"}`}>
          {buttons.map((button, index) => (
            <Button
              key={index}
              variant="ghost"
              className={button.className}
              onClick={() => handleButtonClick(button)}
              data-testid={`button-${button.label.replace(/[^a-zA-Z0-9]/g, '')}`}
            >
              {button.label}
            </Button>
          ))}
        </div>
      </Card>

      {showHistory && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">History</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHistory([])}
              data-testid="button-clear-history"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No calculations yet</p>
            ) : (
              history.map((item, index) => (
                <div key={index} className="text-sm font-mono p-2 bg-muted rounded" data-testid={`history-item-${index}`}>
                  <div className="text-muted-foreground">{item.expression}</div>
                  <div className="font-bold">{item.result}</div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
}