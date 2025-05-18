// src/types.ts

/**
 * LLM을 통해 생성되거나 추출된 SEO 관련 데이터
 */
export interface SEOData {
    /**
     * LLM이 생성한 SEO 최적화 제목 (선택적, 원본 제목을 그대로 사용할 수 있음)
     */
    title?: string;
    /**
     * LLM이 생성한 메타 설명
     */
    description?: string;
    /**
     * LLM이 생성/추출한 키워드 배열
     */
    keywords?: string[];
}

/**
 * LLM 연동 및 기타 처리에 사용될 설정 옵션
 */
export interface LLMConfig {
    /**
     * 사용할 LLM 모델의 이름 (예: Transformers.js 모델명 'Xenova/LaMini-Flan-T5-783M' 또는 한국어 특화 모델)
     * 한국어 SEO 생성을 위해서는 한국어 지원이 좋은 모델로 변경해야 합니다.
     */
    modelName?: string;
    /**
     * (Ollama 등 로컬 API 서버 사용 시) API 엔드포인트 주소.
     * 예: 'http://localhost:11434' (Ollama 기본값)
     * Transformers.js 사용 시에는 일반적으로 필요 없음.
     */
    apiEndpoint?: string;
    /**
     * SEO 정보 생성을 시도할 최소한의 Markdown 본문 길이 (단어 또는 글자 수 기준).
     * 이 길이 미만이면 LLM 호출을 건너뛸 수 있습니다.
     * @default 100 (한국어의 경우 글자 수 기준으로 조정 필요)
     */
    minContentLengthForSeo?: number;
    /**
     * LLM 프롬프트에 포함할 Markdown 본문의 최대 길이 (단어 또는 글자 수 기준).
     * LLM의 컨텍스트 윈도우 제한을 고려하여 설정합니다.
     * @default 300 (한국어의 경우 글자 수 기준으로 조정 필요)
     */
    maxContentLengthForPrompt?: number;
    /**
     * (선택적) LLM에게 전달할 프롬프트 템플릿 파일의 경로.
     * 제공되지 않으면 라이브러리 내장 기본 템플릿 사용. (현재 코드에서는 직접 프롬프트 구성)
     */
    promptTemplatePath?: string;
  }
  
  /**
   * 라이브러리가 스캔하고 처리한 각 Markdown 노트의 정보
   */
  export interface ProcessedNode {
    /**
     * 노트의 고유 식별자 (일반적으로 fullPathSlug와 동일).
     */
    id: string;
    /**
     * 파일명에서 추출한 원본 노트 제목.
     */
    title: string;
    /**
     * ScanOptions의 contentPath를 기준으로 한 상대 파일 경로 (예: 'folder/note.md').
     */
    filePath: string;
    /**
     * 정규화된 전체 경로 슬러그 (예: 'folder/note'). 웹 URL 등에 사용.
     */
    fullPathSlug: string;
    /**
     * 정규화된 단순 파일명 슬러그 (예: 'note').
     */
    simpleSlug: string;
    /**
     * (선택적) Markdown 파일의 원본 내용 (Frontmatter 제외).
     * LLM 처리 등에 필요할 수 있으며, 옵션에 따라 포함 여부 결정.
     */
    content?: string;
    /**
     * (선택적) Markdown 파일에서 파싱된 Frontmatter 데이터.
     * 옵션에 따라 포함 여부 결정.
     */
    frontmatter?: Record<string, any>;
    /**
     * (선택적) LLM을 통해 생성되거나 추출된 SEO 관련 데이터.
     * 옵션에 따라 포함 여부 결정.
     */
    seo?: SEOData;
    /**
     * (선택적) 파일의 최종 수정일.
     * 옵션에 따라 포함 여부 결정.
     */
    lastModified?: Date;
  }
  
  /**
   * 라이브러리의 메인 스캔 함수의 입력 옵션
   */
  export interface ScanOptions {
    /**
     * 필수: 탐색할 Markdown 콘텐츠의 루트 디렉터리 경로.
     */
    contentPath: string;
    /**
     * 선택: glob 패턴으로 무시할 파일/폴더 목록.
     * @default ["**\/node_modules/**", "**\/.*"]
     */
    ignorePatterns?: string[];
    /**
     * 선택: 커스텀 슬러그 생성 함수.
     * (text: string, isFullPath: boolean) => string 형식.
     * isFullPath는 슬러그 대상이 전체 경로인지(true), 단순 제목인지(false) 구분.
     * 제공되지 않으면 라이브러리 내장 기본 슬러그 함수 사용.
     */
    slugifyFn?: (text: string, isFullPath: boolean) => string;
    /**
     * 선택: Markdown 파일에서 Frontmatter를 파싱하여 결과에 포함할지 여부.
     * @default false
     */
    includeFrontmatter?: boolean;
    /**
     * 선택: 파일의 최종 수정일을 결과에 포함할지 여부.
     * @default false
     */
    includeLastModified?: boolean;
    /**
     * 선택: LLM을 사용하여 SEO 정보를 생성하고 결과에 포함할지 여부.
     * @default false
     */
    generateSeo?: boolean;
    /**
     * 선택: generateSeo가 true일 경우 사용될 LLM 관련 설정.
     */
    llmConfig?: LLMConfig;
  }
  
  /**
   * 라이브러리의 메인 스캔 함수의 반환 타입
   */
  export interface ScanResult {
    /**
     * 처리된 모든 노트 정보의 배열.
     */
    allNotes: ProcessedNode[];
    /**
     * 전체 경로 슬러그(fullPathSlug)를 키로 하여 ProcessedNode를 빠르게 조회할 수 있는 맵.
     */
    notesMapByFullPathSlug: Map<string, ProcessedNode>;
    /**
     * 단순 파일명 슬러그(simpleSlug)를 키로 하여, 해당 슬러그를 가진 모든 노트의
     * 전체 경로 슬러그(fullPathSlug)들의 Set을 값으로 가지는 맵.
     * (동일한 파일명을 가진 노트가 다른 폴더에 있을 경우를 처리)
     */
    notesMapBySimpleSlug: Map<string, Set<string>>;
    // 그래프 데이터 등 추가적인 처리 결과가 있다면 여기에 포함될 수 있음
    // graphData?: { nodes: GraphNode[], edges: GraphEdge[] };
  }
  
  // 그래프 데이터 타입 (만약 라이브러리가 그래프 정보도 반환한다면)
  // export interface GraphNode {
  //   id: string; // ProcessedNode의 fullPathSlug와 일치
  //   label: string; // ProcessedNode의 title과 일치
  // }
  
  // export interface GraphEdge {
  //   id: string; // "sourceId->targetId" 형태의 고유 ID
  //   source: string; // 출발 노드의 ID (fullPathSlug)
  //   target: string; // 도착 노드의 ID (fullPathSlug)
  // }