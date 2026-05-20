import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

var root_1 = $.from_html(`<p>pending</p>`);
var root_2 = $.from_html(`<p> </p>`);
var root = $.from_html(`<!> <button>mutate</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	const $data = () => $.store_get(data, '$data', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	const data = writable({ count: 1 });

	function mutate_count() {
		data.update((d) => {
			d.count++;

			return d;
		});
	}

	async function compute(d) {
		return Promise.resolve(d.count * 10);
	}

	var fragment = root();
	var node = $.first_child(fragment);

	{
		const pending = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			var p_1 = root_2();
			var text = $.child(p_1);

			$.reset(p_1);
			$.template_effect(($0) => $.set_text(text, `count: ${$data().count ?? ''}, computed: ${$0 ?? ''}`), void 0, [() => compute($data())]);
			$.append($$anchor, p_1);
		});
	}

	var button = $.sibling(node, 2);

	$.delegated('click', button, mutate_count);
	$.append($$anchor, fragment);
	$.pop();
	$$cleanup();
}

$.delegate(['click']);