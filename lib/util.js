module.exports = {
  async getNickname(server, user) {
    const member = await server.members.fetch(user.id)
    if (member) return member.nickname || member.username

    return null
  }
}