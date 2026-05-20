import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	$$renderer.push(`<div${$.attributes({ ...{ class: 'bar' }, class: 'foo' }, 'svelte-70s021')}>red</div> <div${$.attributes({ class: 'foo', ...{ class: 'qux' } }, 'svelte-70s021')}>red</div> <div${$.attributes({ ...{ class: 'bar' } }, 'svelte-70s021')}>red and bold</div>`);
}