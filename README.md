# Water Can Ledger

Clone and fully reproduce the repository at https://github.com/AK-kUMAR-001/water-can-ledger.git in this project - but keep the project name simple and the git name also simple no messy 

list of to  do are : 

Update the current water can ledger app per user requirements. 1) After a data entry is saved, reset the can/gan quantity input to 0 (and ensure it visibly shows 0 for the next entry). 2) Improve the Company search field: when typing a letter/string such as 'a', show matching company suggestions, case-insensitively, including matches regardless of uppercase/lowercase. Follow attached screenshot behavior: an input/search dropdown list under the company field. 3) Add an 'Export Excel' option/button above Save Entry. It must export all ledger data from the beginning through the current date in an Excel-compatible .xlsx file, including relevant entry/customer/delivery/transaction details. 4) On the Customers page, add a Delivered History section before the existing Transaction History section, showing delivery records for the customer. Preserve existing styling and functionality; ensure the new controls work on mobile too.

Enhance the current app's export and history features. Export Excel: add a company selector with default ']whih companny choosed '; exporting All must produce one workbook with a separate worksheet for every company, containing every historical entry up to today. If a particular company is selected, export only that company’s complete history through today in its own workbook/sheet. Each company sheet must have clear RED-filled header cells and columns in this order: Heading/Entry type, Date, Day, Company Name, No. of Gan, Price, Amount (Gan × Price), Total Pending. Format dates properly (human-readable date) and calculate a running Total Pending for that company's historical rows, including all previous calculations. Use valid unique Excel sheet names and handle names exceeding Excel limits safely. Ensure no records are omitted, data sorting is chronological, and it remains usable on mobile. History page: add a company select/filter dropdown defaulting to 'All Companies', which shows the combined full history by default; selecting a company shows that specific company's complete history. Ensure all relevant history data and existing UI functionality remain intact.

then in home page u need to have that related company export  , 

Export an Excel file that includes all previous entries up to the current date with clear column headers and proper date formatting - that shoul include day wise entry with heading , date ,day ,

compay name , no of gan , price , amount = gan x price ,then total pending all added previos calcuation amount based , and each company should be in single seperate sheet ,if 100 company means all the company should be in seperate 100 diff sheets , 

make te head color red ... 

it should be followed in the export tooo 

if particular if given as export that alone should come in with all previous data still now , 

then in history page make choose select option of company too if i choosed partilcar data history should come , and with an option all default each company if clicked then full history of that particular  ,

After entering a data and save entry ,the number of gan should be 0 ;

In search company field while searching if i type a the list of a starting company should be listed both upper case and low case ;

And add an export data with all previos till yet to date as an export excel option above the save entry ;

in customer/ page there is transaction history but there we need a Delivered history and then transaction history ;

from the list above check which have been done adn which till not yet , if undone do that and do a gt push and give the giturl to mee in the chat ...


and then in each page keep a next and back option to move or come back to the pages

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3c90a78c-7f63-471f-bbdf-8401c5958ce9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
