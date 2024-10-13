import { chromium } from "playwright"
import { createClient } from '@supabase/supabase-js'



const survivorPerks = await getSurvivorPerks()
// Transform scrapped data
const survivors = survivorPerks.reduce((acc, curr) => {
    if (curr && !acc.some(item => item.name === curr.survivor)) {
      acc.push({ name: curr.survivor, image: curr.survivorImage });
    }
    return acc;
  }, []);

const perks = survivorPerks?.filter((perk) => perk)?.map((perk) => {
    return {image: perk.image, name: perk.name, description: perk.description, survivor_name: perk.survivor}
})


const supabase = createClient(process.env.API_URL, process.env.API_KEY)
await deleteData()
await insertData()


// Scrape Dbd Wiki and return array of objects (perks and survivors data)
async function getSurvivorPerks(){
  // const browser = await chromium.launch({headless: true})
  const browser = await chromium.launch()

  const page = await browser.newPage()

  await page.goto(
      'https://deadbydaylight.fandom.com/wiki/Survivor_Perks', { waitUntil: 'domcontentloaded', timeout: 600000 }
  )

  const survivorPerks = await page.$$eval(
      '.wikitable tr',
      (results) => (
          results.map((el, index) => {
              if(index === 0) return null

              const allTh = el.querySelectorAll('th')
              
              const image = allTh[0]?.querySelector('a')?.getAttribute('href')
              const name = allTh[1]?.innerText
              const survivor = allTh[2]?.innerText?.replace('\n', '')
              const survivorImage = allTh[2]?.querySelector('img')?.getAttribute('data-src')

              const td = el.querySelector('td')

              const description = td?.innerText

              return {image, name, description, survivor, survivorImage}
          })
      )
  )
  await browser.close()

  return survivorPerks
}

// Delete all perks & survivors
async function deleteData(){
  await supabase
  .from('perks')
  .delete()
  .neq('id', 0)

  await supabase
  .from('survivors')
  .delete()
  .neq('id', 0)
}

// Insert survivors & perks
async function insertData(){
  await supabase
    .from('survivors')
    .insert(survivors)

  await supabase
    .from('perks')
    .insert(perks)
}