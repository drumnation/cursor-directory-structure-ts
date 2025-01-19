// types.ts
interface ProjectInfo {
  name: string;
  version: string;
  language: string;
  framework: string;
  type: string;
  description?: string;
  project_path?: string;
}

interface FileLengthStandards {
  [key: string]: number;
}

interface ImportPattern {
  [key: string]: string;
}

interface ClassPattern {
  [key: string]: string;
}

interface FunctionPattern {
  [key: string]: string;
}

interface AiConfig {
  model: string;
  temperature: number;
  maxOutputTokens: number;
  topP: number;
  topK: number;
  safetySettings: {
    category: string;
    threshold: string;
  }[];
}

interface Rules {
  version: string;
  last_updated: string;
  project: {
    name: string;
    version: string;
    language: string;
    framework: string;
    type: string;
  };
  ai_behavior: {
    code_generation: {
      style: {
        prefer: string[];
        avoid: string[];
      };
      error_handling: {
        prefer: string[];
        avoid: string[];
      };
      performance: {
        prefer: string[];
        avoid: string[];
      };
      security: {
        prefer: string[];
        avoid: string[];
      };
      validate_user_data: boolean;
      avoid_eval: boolean;
    };
    accessibility: {
      standards: string[];
      require_alt_text: boolean;
      focus_indicators: boolean;
      aria_labels: boolean;
    };
  };
  communication: {
    style: string;
    level: string;
    on_error: string[];
    on_success: string[];
    confirmations: {
      required_for: string[];
    };
  };
  response_format: {
    always: string[];
    never: string[];
  };
}

interface ProjectStructure {
  dependencies: { [key: string]: boolean };
  patterns: {
    imports: string[];
    class_patterns: {
      name: string;
      type: string;
      file: string;
    }[];
    function_patterns: {
      name: string;
      parameters: string;
      file: string;
    }[];
    code_organization: {
      type: string;
      from: string;
      to: string;
      file: string;
    }[];
  };
}

export {
  ProjectInfo,
  FileLengthStandards,
  ImportPattern,
  ClassPattern,
  FunctionPattern,
  AiConfig,
  Rules,
  ProjectStructure,
};
