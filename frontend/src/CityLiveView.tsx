import { t } from './i18n'
import { useState } from 'react'

const streamUrl = 'https://www.youtube.com/watch?v=tSQAb1BuaAg'
const embedUrl = 'https://www.youtube-nocookie.com/embed/tSQAb1BuaAg?autoplay=1'

export function CityLiveView() {
  const [showStream, setShowStream] = useState(false)

  return (
    <section className="city-live-view" aria-labelledby="city-live-title">
      <div className="city-live-heading">
        <div>
          <span className="section-kicker">{t("ГОРОДСКОЙ КОНТЕКСТ · ПУБЛИЧНЫЙ ЭФИР")}</span>
          <h2 id="city-live-title">{t("Астана сейчас")}</h2>
        </div>
        <a href={streamUrl} target="_blank" rel="noreferrer">{t("Открыть на YouTube ↗")}</a>
      </div>
      <p>{t("Эфир Atameken Business может переключать городские виды. Это только визуальный контекст: видео не анализируется и не влияет на показатели.")}</p>
      {showStream ? (
        <div className="city-live-player-wrap">
          <iframe
            className="city-live-player"
            src={embedUrl}
            title={t("Публичный эфир Atameken Business с видами Астаны")}
            referrerPolicy="strict-origin-when-cross-origin"
            allow="autoplay; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
          />
          <button className="city-live-close" type="button" onClick={() => setShowStream(false)}>{t("Закрыть эфир")}</button>
        </div>
      ) : (
        <button className="city-live-load" type="button" onClick={() => setShowStream(true)}>
           {t("Загрузить публичный эфир")} <span aria-hidden="true">▶</span>
        </button>
      )}
      <small>{t("Источник: Atameken Business · локация камеры может меняться · сторонний плеер загружается только по нажатию")}</small>
    </section>
  )
}
