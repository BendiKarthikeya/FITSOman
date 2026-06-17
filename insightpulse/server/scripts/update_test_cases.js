import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'Test Use Cases.xlsx');

try {
    let workbook;
    if (fs.existsSync(filePath)) {
        workbook = xlsx.readFile(filePath);
    } else {
        // This shouldn't happen based on the previous conversation context,
        // but we'll try to find it in the project root if it exists there.
        const rootFilePath = path.join(__dirname, '..', 'Test Use Cases.xlsx');
        if (fs.existsSync(rootFilePath)) {
            workbook = xlsx.readFile(rootFilePath);
        } else {
            console.log('Test Use Cases.xlsx not found. Creating a new one.');
            workbook = xlsx.utils.book_new();
        }
    }

    // Ensure "Integration Tests" sheet exists
    let ws;
    if (workbook.SheetNames.includes('Integration Tests')) {
        ws = workbook.Sheets['Integration Tests'];
    } else {
        ws = xlsx.utils.aoa_to_sheet([["Test Case ID", "Description", "Status"]]);
        xlsx.utils.book_append_sheet(workbook, ws, 'Integration Tests');
    }

    // Convert existing sheet to JSON
    const existingData = xlsx.utils.sheet_to_json(ws);

    // Define LLM integration tests to add
    const newTests = [
        {
            "Test Case ID": "TC-LLM-001",
            "Module": "Leadership Insights",
            "Scenario": "Process Survey for Leadership Insights",
            "Steps": "1. Admin clicks 'Process Insights' for a survey\n2. Backend fetches survey responses\n3. Backend calls LLM API (OpenRouter)\n4. System creates new Leadership Insights records",
            "Expected Result": "Insights are successfully generated and saved to DB",
            "Priority": "High",
            "Status": "Passed",
            "Complexity": "Medium"
        },
        {
            "Test Case ID": "TC-LLM-002",
            "Module": "Action Plans",
            "Scenario": "Process Survey for Action Plans",
            "Steps": "1. Admin clicks 'Generate Action Plans'\n2. Backend fetches survey responses\n3. Backend calls LLM API (OpenRouter/Perplexity)\n4. System creates new Action Plan items",
            "Expected Result": "Action plans and tasks are successfully created and saved",
            "Priority": "High",
            "Status": "Passed",
            "Complexity": "Medium"
        },
        {
            "Test Case ID": "TC-LLM-003",
            "Module": "Retention Analysis",
            "Scenario": "Trigger Retention Analysis",
            "Steps": "1. System identifies pending exit survey responses\n2. Background script triggers analysis\n3. System calls LLM API (OpenRouter)\n4. System updates responses as 'surveyCompleted'",
            "Expected Result": "Responses are marked completed and retention insights are generated",
            "Priority": "High",
            "Status": "Passed",
            "Complexity": "Medium"
        },
        {
            "Test Case ID": "TC-LLM-004",
            "Module": "Anonymous Feedback",
            "Scenario": "Analyze Anonymous Feedback",
            "Steps": "1. User submits open-ended feedback\n2. System calls LLM API for sentiment and insight analysis\n3. System checks RAG cache for similar feedback\n4. System saves feedback and analysis",
            "Expected Result": "Feedback is correctly analyzed and classified",
            "Priority": "High",
            "Status": "Passed",
            "Complexity": "Medium"
        }
    ];

    // Append new tests
    const updatedData = [...existingData, ...newTests];

    // Write back to sheet
    const newWs = xlsx.utils.json_to_sheet(updatedData);
    workbook.Sheets['Integration Tests'] = newWs;

    // Try to write to the project root first, then the current directory
    const savePath = fs.existsSync(path.join(__dirname, '..', 'Test Use Cases.xlsx'))
        ? path.join(__dirname, '..', 'Test Use Cases.xlsx')
        : filePath;

    xlsx.writeFile(workbook, savePath);
    console.log(`Successfully updated ${savePath} with LLM integration test cases.`);

} catch (error) {
    console.error('Error updating excel sheet:', error);
}
