export function initialState() {
  const durations = Array.from({ length: 16 }, (_, i) => (i + 1) * 15)
  const project = (id, name, choices, extra = false, exclusive = false) => ({
    project_id: id, name, category: extra ? 'extra_income' : 'main',
    category_label: extra ? '收入附加' : '服务项目', main_eligible: extra ? 0 : 1,
    status: 1, durations: choices, exclusive,
  })
  return {
    nextServiceId: 1, nextItemId: 1, nextVersionId: 2,
    projects: [project(1, '普通推拿', durations), project(2, '精油推拿', durations),
      project(3, '上门服务', durations.filter(n => n >= 90), false, true),
      project(5, '刮痧', [30]), project(6, '拔罐', [30]),
      project(7, '升级精油', [], true), project(8, '热敷包', [], true)],
    versions: [{ id: 1, effective_from: '2026-07-01 00:00:00', base_rate: '40',
      rules: { 1: { pay_type: 'work', work_multiplier: '1' },
        2: { pay_type: 'work', work_multiplier: '2' },
        3: { pay_type: 'work', work_multiplier: '1.5' },
        5: { pay_type: 'work', work_multiplier: '1' },
        6: { pay_type: 'work', work_multiplier: '1' },
        7: { pay_type: 'fixed', fixed_income: '3' },
        8: { pay_type: 'fixed', fixed_income: '2' } } }],
    services: [],
  }
}
