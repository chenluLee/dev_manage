export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateOllamaUrl(url: string): ValidationResult {
  if (!url) {
    return { isValid: false, error: "URL不能为空" };
  }

  if (!url.trim()) {
    return { isValid: false, error: "URL不能为空" };
  }

  try {
    const parsedUrl = new URL(url);
    
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { isValid: false, error: "URL必须以http://或https://开头" };
    }
    
    if (!parsedUrl.hostname) {
      return { isValid: false, error: "URL必须包含有效的主机名" };
    }
    
    return { isValid: true };
  } catch {
    return { isValid: false, error: "无效的URL格式" };
  }
}

export function validateModelName(modelName: string): ValidationResult {
  if (!modelName) {
    return { isValid: false, error: "模型名称不能为空" };
  }

  if (!modelName.trim()) {
    return { isValid: false, error: "模型名称不能为空" };
  }

  if (modelName.length > 100) {
    return { isValid: false, error: "模型名称不能超过100个字符" };
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(modelName)) {
    return { isValid: false, error: "模型名称只能包含字母、数字、点号、下划线和连字符" };
  }

  return { isValid: true };
}

export function validateTemperature(temperature: number): ValidationResult {
  if (isNaN(temperature)) {
    return { isValid: false, error: "温度参数必须是数字" };
  }

  if (temperature < 0) {
    return { isValid: false, error: "温度参数不能小于0" };
  }

  if (temperature > 2) {
    return { isValid: false, error: "温度参数不能大于2" };
  }

  return { isValid: true };
}

export function validateAiConfig(config: {
  ollamaUrl: string;
  modelName: string;
  temperature: number;
}): ValidationResult {
  const urlValidation = validateOllamaUrl(config.ollamaUrl);
  if (!urlValidation.isValid) {
    return urlValidation;
  }

  const modelValidation = validateModelName(config.modelName);
  if (!modelValidation.isValid) {
    return modelValidation;
  }

  const temperatureValidation = validateTemperature(config.temperature);
  if (!temperatureValidation.isValid) {
    return temperatureValidation;
  }

  return { isValid: true };
}