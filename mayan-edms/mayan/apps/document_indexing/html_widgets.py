from django.apps import apps
from django.utils.html import escape, mark_safe

from .icons import (
    icon_index, icon_index_instance_node_with_documents, icon_index_level_up
)


def get_instance_link(index_instance_node):
    """
    Return an HTML anchor to an index node instance
    """
    full_path = escape(
        text=index_instance_node.get_full_path()
    )
    url = index_instance_node.get_absolute_url()

    result = '<a href="{url}">{full_path}</a>'.format(
        full_path=full_path, url=url
    )

    output = mark_safe(s=result)

    return output


def index_instance_item_link(index_instance_item):
    IndexInstanceNode = apps.get_model(
        app_label='document_indexing', model_name='IndexInstanceNode'
    )

    if isinstance(index_instance_item, IndexInstanceNode):
        if index_instance_item.index_template_node.link_documents:
            icon = icon_index_instance_node_with_documents.render()
        else:
            icon = icon_index_level_up.render()
    else:
        icon = ''

    text = escape(text=index_instance_item)
    url = index_instance_item.get_absolute_url()

    result = '{icon}&nbsp;<a href="{url}">{text}</a>'.format(
        icon=icon, text=text, url=url
    )

    output = mark_safe(s=result)

    return output


def node_level(node):
    """
    Render an indented tree like output for a specific node.
    """
    level = node.get_level()
    if node.is_root_node():
        icon = ''
    else:
        icon = icon_index_level_up.render()

    node_text = escape(
        text=str(node)
    )

    spacing = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' * level

    level = ''.join(
        [spacing, icon, node_text]
    )

    output = mark_safe(s=level)

    return output


def node_tree(node, user):
    result = []

    result.append('<div class="list-group">')

    for ancestor in node.get_ancestors(include_self=True):
        if ancestor.is_root_node():
            element = node.index()
            icon = icon_index
        else:
            element = ancestor
            if element.index_template_node.link_documents:
                icon = icon_index_instance_node_with_documents
            else:
                icon = icon_index_level_up

        if element == node or node.get_ancestors(include_self=True).count() == 1:
            active = 'active'
        else:
            active = ''
        count = element.get_descendants_document_count(user=user)
        icon = icon.render()
        text = escape(text=element)
        url = element.get_absolute_url()

        level_result = '<a href="{url}" class="list-group-item {active}"><span class="badge">{count}</span>{icon} {text}</a>'.format(
            active=active, count=count, icon=icon, text=text, url=url
        )

        result.append(level_result)

    result.append('</div>')

    output = mark_safe(
        s=''.join(result)
    )

    return output
