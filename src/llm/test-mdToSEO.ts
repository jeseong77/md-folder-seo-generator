// src/llm/test-mdToSEO.ts
import { markdownToSEO } from './mdToSEO';
import type { LLMConfig, SEOData } from '../types';
import { env as transformersEnv } from '@xenova/transformers'; // transformers.js의 env 객체

// 각 테스트 케이스의 결과를 저장하기 위한 인터페이스 (선택적)
interface TestCaseOutput {
    originalTitle: string;
    wasProcessedByLLM: boolean; // LLM이 실제로 호출되어 데이터를 반환했는지 여부
    shouldHaveBeenProcessed: boolean;
    statusMessage: string;
    seoData?: SEOData;
    error?: string; // markdownToSEO에서 오류 발생 시 기록 (선택적)
}

async function runTest() {
    // ONNX Runtime의 로그 레벨을 'fatal'로 설정하여 경고(warning) 및 오류(error) 메시지 대부분을 숨깁니다.
    if (transformersEnv.backends.onnx && typeof transformersEnv.backends.onnx.logLevel !== 'undefined') {
        transformersEnv.backends.onnx.logLevel = 'fatal'; // 'error'보다 더 조용하게
    }

    console.log('Starting SEO generation tests (English)...');

    const testCases = [
        {
            title: "My First Blog Post",
            content: "This is the content of my first blog post. I am testing the automatic SEO information generation feature. It needs enough words to pass the minimum content length. Let's add some more filler text to make sure it meets the criteria for processing. This should be well over 50 words or the configured threshold. We are discussing important topics like AI, SEO, and content creation. This should be sufficient content.",
            expectedToProcess: true,
        },
        {
            title: "Short Note",
            content: "This is a very short note. It should be skipped by the SEO generator.",
            expectedToProcess: false,
        },
        {
            title: "Another Post About AI and SEO",
            content: "Artificial intelligence is rapidly changing the world. This post explores the impact of AI on Search Engine Optimization (SEO) and how content creators can adapt. We will delve into techniques for leveraging AI tools to improve rankings and visibility. This content is specifically designed to be processed and yield some SEO data. Let's ensure it's long enough.",
            expectedToProcess: true,
        },
        {
            title: "Exploring the Wonders of Nature",
            content: "Today, I went hiking in the national park. The scenery was breathtaking, with lush green forests, towering mountains, and crystal-clear rivers. I saw various wildlife, including deer, squirrels, and many species of birds. Nature has a way of rejuvenating the soul. This experience reminded me of the importance of conservation and protecting our planet for future generations. It was a truly memorable day.",
            expectedToProcess: true,
        },
        { // Non-English title, should be skipped by LLM
            title: "나의 한국어 테스트 포스트",
            content: "This is a test post with a Korean title to check if the LLM processing is skipped. The content itself is in English, but the title language check should prevent LLM invocation. We want to ensure that non-English posts are handled gracefully, perhaps by falling back to non-LLM based SEO generation or by simply skipping this step if only LLM generation for English is configured.",
            expectedToProcess: false,
        }
    ];

    const defaultConfig: LLMConfig = {
        minContentLengthForSeo: 50,
        maxContentLengthForPrompt: 300,
    };

    // 모든 테스트 결과를 저장할 객체
    const allTestResults: Record<string, TestCaseOutput> = {};

    for (const testCase of testCases) {
        // 각 테스트 시작을 알리는 로그는 유지하여 진행 상황을 볼 수 있게 합니다.
        console.log(`\n--- Processing Title: "${testCase.title}" ---`);
        let resultStatus: string;
        let generatedSeoData: SEOData | undefined = undefined;
        let llmProcessed = false;

        try {
            generatedSeoData = await markdownToSEO(
                testCase.title,
                testCase.content,
                defaultConfig
            );

            if (generatedSeoData) {
                llmProcessed = true; // SEO 데이터가 반환되면 LLM이 처리한 것으로 간주
                if (!testCase.expectedToProcess) {
                    resultStatus = "FAILED: Expected to be SKIPPED, but was PROCESSED by LLM.";
                    console.error(`⚠️ Test for "${testCase.title}" - ${resultStatus}`);
                } else {
                    resultStatus = "SUCCESS: Processed by LLM as expected.";
                }
            } else { // seoData is undefined
                llmProcessed = false;
                if (testCase.expectedToProcess) {
                    resultStatus = "FAILED: Expected to be PROCESSED by LLM, but was SKIPPED or FAILED.";
                    console.error(`⚠️ Test for "${testCase.title}" - ${resultStatus}`);
                } else {
                    // markdownToSEO 내부에서 언어 또는 길이로 인해 건너뛴 경우
                    resultStatus = "SUCCESS: Skipped as expected (e.g., non-English, too short, or LLM failed on skippable item).";
                }
            }
        } catch (e: any) {
            llmProcessed = false; // 오류 발생 시 처리 안된 것으로 간주
            resultStatus = `ERROR: Exception during markdownToSEO call - ${e.message}`;
            console.error(`💥 Exception for "${testCase.title}": ${e.message}`);
            allTestResults[testCase.title] = {
                originalTitle: testCase.title,
                wasProcessedByLLM: llmProcessed,
                shouldHaveBeenProcessed: testCase.expectedToProcess,
                statusMessage: resultStatus,
                error: e.message,
            };
            continue; // 다음 테스트 케이스로 넘어감
        }

        allTestResults[testCase.title] = {
            originalTitle: testCase.title,
            wasProcessedByLLM: llmProcessed,
            shouldHaveBeenProcessed: testCase.expectedToProcess,
            statusMessage: resultStatus,
            seoData: generatedSeoData,
        };
    }

    console.log('\n\n--- All Test Results ---');
    // 객체를 보기 좋게 JSON 문자열로 변환하여 출력
    console.log(JSON.stringify(allTestResults, null, 2));
    console.log('\nSEO generation tests completed.');
}

runTest().catch(console.error);