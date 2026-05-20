import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div> </div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const list = $.mutable_source();
	let data = $.prop($$props, 'data', 28, () => [{ id: '1' }, { id: '2' }, { id: '3' }]);
	let refs = $.prop($$props, 'refs', 28, () => []);

	$.legacy_pre_effect(() => ($.deep_read_state(data())), () => {
		$.set(list, data().reverse());
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get data() {
			return data();
		},

		set data($$value) {
			data($$value);
			$.flush();
		},

		get refs() {
			return refs();
		},

		set refs($$value) {
			refs($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 3, () => $.get(list), ({ id }) => id, ($$anchor, $$item, index) => {
		let id = () => $.get($$item).id;
		var div = root_1();
		var text = $.child(div);

		$.reset(div);
		$.bind_this(div, ($$value, index) => refs(refs()[index] = $$value, true), (index) => refs()?.[index], () => [$.get(index)]);

		$.template_effect(() => $.set_text(text, `content ${$.get(index) ?? ''} ${id() ?? ''} ${(
			$.deep_read_state(data()),
			$.deep_read_state($.get(index)),
			$.untrack(() => data()[$.get(index)].id)
		) ?? ''}`));

		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}