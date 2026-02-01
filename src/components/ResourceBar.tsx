import { useGameStore } from '../store';
import './ResourceBar.css';

export const ResourceBar = () => {
  const { day, resources, getNextNorma, getDaysUntilNorma } = useGameStore();
  const nextNorma = getNextNorma();
  const daysUntil = getDaysUntilNorma();

  return (
    <div className="resource-bar">
      <div className="day-info">
        <div className="day">Day {day}</div>
        <div className="norma-info">
          <span className="norma-timer">⏰ あと{daysUntil}日</span>
          <span className="norma-amount">💸 -{nextNorma}</span>
        </div>
      </div>
      <div className="resources">
        <span className="resource">
          <img src="https://img.icons8.com/color/48/coin--v1.png" alt="money" className="resource-icon" />
          {resources.money}
        </span>
        <span className="resource">
          <img src="https://img.icons8.com/color/48/fire-element--v1.png" alt="lit" className="resource-icon" />
          {resources.lit}
        </span>
      </div>
    </div>
  );
};
