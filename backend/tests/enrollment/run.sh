cd test0
npx artillery run test.json -o result.json      
npx artillery report ./result.json

cd ../test1
npx artillery run test.json -o result.json      
npx artillery report ./result.json

cd ../test2
npx artillery run test.json -o result.json      
npx artillery report ./result.json

cd ../test3
npx artillery run test.json -o result.json      
npx artillery report ./result.json

cd ../test4
npx artillery run test.json -o result.json      
npx artillery report ./result.json
cd ../