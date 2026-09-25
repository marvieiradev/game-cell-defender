// Recursos do jogo: energia é a moeda principal da célula.

export class Economy {
  constructor(starting = 30) {
    this.resources = { crystal: starting };
    this.totalEarned = starting;
  }

  get crystals() {
    return Math.floor(this.resources.crystal);
  }

  add(amount, type = "crystal") {
    this.resources[type] = (this.resources[type] || 0) + amount;
    if (type === "crystal") this.totalEarned += amount;
  }

  can(amount, type = "crystal") {
    return (this.resources[type] || 0) >= amount;
  }

  spend(amount, type = "crystal") {
    if (!this.can(amount, type)) return false;
    this.resources[type] -= amount;
    return true;
  }

  reset(starting = 30) {
    this.resources = { crystal: starting };
    this.totalEarned = starting;
  }
}
