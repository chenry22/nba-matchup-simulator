import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

export default function AboutPage() {
  const nav = useNavigate();

  const buttonStyle: CSSProperties = {
    color: 'white', background: 'darkblue',
    cursor: 'pointer', padding: '12px 16px', borderRadius: '6px',
    width: 'fit-content', margin: '0 auto', fontSize: '1.2rem'
  };

  return (
    <div style={{ margin: '10% auto', maxWidth: '800px', width: '80%', padding: '36px 48px', background: 'white', color: 'black'}}>
        <div style={{ float: 'left', color: 'darkblue', cursor: 'pointer' }} onClick={() => nav('/')}>&larr; Back</div>
        <br></br><br></br>
        <p>This is a project I created original to practice parsing data, then to see if I could actually make a simulation engine that worked ok. I also liked the idea of having four Dario Sarics trying to take down one Victor Wembanyama. Basketball is not that serious, even when it's statistically backed in some ways. So now there's a rating system. I'm manually parsing the data from each season, so right now the players available are a bit limited. I'd like to get back to the 90s and the 60s and get some Wilt Chamberlain and some Michael Jordan and etc., eventually.</p>
        <br></br>
        <p>If you have any suggestions or advice or things to say, please reach out! I'm most easily contactable through <a href="mailto:calebhenry7095@gmail.com" target="_blank">calebhenry7095@gmail.com</a></p>
        <br></br>
        <p>You can find other projects on my <a href="https://github.com/chenry22" target="_blank">GitHub</a>, <a href="https://www.are.na/caleb-h/creations-4izh8saljlk" target="_blank">Are.na</a>, <a href="https://linktr.ee/chenry22" target="_blank">etc.</a></p>
    </div>
  );
}